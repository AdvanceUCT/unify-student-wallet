import {
  completeWalletActivation,
  resolveWalletActivation,
} from "@/src/features/wallet/activationResolver";
import { DEMO_STUDENT_ID, DEMO_WALLET_ID } from "@/src/features/wallet/sessionTypes";

const originalFetch = global.fetch;
const originalAdminApiBaseUrl = process.env.EXPO_PUBLIC_UNIFY_ADMIN_API_BASE_URL;

function mockResponse(body: object, ok = true, status = 200) {
  return {
    json: jest.fn(async () => body),
    ok,
    status,
  } as unknown as Response;
}

describe("wallet activation resolver", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_UNIFY_ADMIN_API_BASE_URL = originalAdminApiBaseUrl;
    jest.clearAllMocks();
  });

  it("uses the admin mock resolve and complete APIs when configured", async () => {
    process.env.EXPO_PUBLIC_UNIFY_ADMIN_API_BASE_URL = "http://localhost:3000/";
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        mockResponse({
          activationId: "activation-7MFK2Q9V",
          activationSource: "token",
          createdAt: "2026-04-27T10:00:00.000Z",
          expiresAt: "2026-04-28T10:00:00.000Z",
          invitationId: "unify-oob-7MFK2Q9V",
          invitationUrl: "https://issuer.advanceuct.test/oob?oob=mock",
          issuerLabel: "UNIFY Issuer Service",
          ledgerName: "BCovrin Test",
          studentId: "student-demo-002",
          walletId: "wallet-demo-001",
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          activatedAt: "2026-04-27T10:05:00.000Z",
          activationId: "activation-7MFK2Q9V",
          credentialRecordId: "credential-record-demo",
          holderConnectionId: "connection-demo",
        }),
      );

    const resolved = await resolveWalletActivation({
      kind: "token",
      sourceUrl: "unifywallet://activate?token=mock-act-7MFK2Q9V",
      token: "mock-act-7MFK2Q9V",
    });

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) {
      throw new Error(resolved.error);
    }

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/mock/wallet/activation/resolve",
      expect.objectContaining({
        body: JSON.stringify({
          kind: "token",
          sourceUrl: "unifywallet://activate?token=mock-act-7MFK2Q9V",
          token: "mock-act-7MFK2Q9V",
        }),
        method: "POST",
      }),
    );
    expect(resolved.data).toMatchObject({
      activationId: "activation-7MFK2Q9V",
      activationSource: "token",
      studentId: "student-demo-002",
    });

    const completed = await completeWalletActivation(
      resolved.data,
      "connection-demo",
      "credential-record-demo",
    );

    expect(completed).toEqual({
      ok: true,
      data: {
        activationId: "activation-7MFK2Q9V",
        completedAt: "2026-04-27T10:05:00.000Z",
        credentialRecordId: "credential-record-demo",
        holderConnectionId: "connection-demo",
      },
    });
    expect(global.fetch).toHaveBeenLastCalledWith(
      "http://localhost:3000/api/mock/wallet/activation/complete",
      expect.objectContaining({
        body: JSON.stringify({
          activationId: "activation-7MFK2Q9V",
          credentialRecordId: "credential-record-demo",
          holderConnectionId: "connection-demo",
        }),
        method: "POST",
      }),
    );
  });

  it("returns an activation service error when token resolve has no admin API", async () => {
    delete process.env.EXPO_PUBLIC_UNIFY_ADMIN_API_BASE_URL;
    global.fetch = jest.fn();

    const resolved = await resolveWalletActivation({
      kind: "token",
      sourceUrl: "unifywallet://activate?token=local-token",
      token: "local-token",
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(resolved).toEqual({
      ok: false,
      error: "Activation service is unavailable. Check that the admin portal is running and try again.",
    });
  });

  it("returns an activation service error when the configured admin API is unavailable", async () => {
    process.env.EXPO_PUBLIC_UNIFY_ADMIN_API_BASE_URL = "http://localhost:3000";
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const resolved = await resolveWalletActivation({
      kind: "token",
      sourceUrl: "unifywallet://activate?token=offline-token",
      token: "offline-token",
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(resolved).toEqual({
      ok: false,
      error: "Activation service is unavailable. Check that the admin portal is running and try again.",
    });
  });

  it("keeps local OOB resolution for issuer development", async () => {
    delete process.env.EXPO_PUBLIC_UNIFY_ADMIN_API_BASE_URL;
    global.fetch = jest.fn();
    const invitationUrl = "https://issuer.advanceuct.test/oob?oob=abc";

    const resolved = await resolveWalletActivation({
      invitationUrl,
      kind: "oob",
      sourceUrl: `unifywallet://activate?oob=${encodeURIComponent(invitationUrl)}`,
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(resolved).toMatchObject({
      ok: true,
      data: {
        activationSource: "oob",
        invitationUrl,
        studentId: DEMO_STUDENT_ID,
        walletId: DEMO_WALLET_ID,
      },
    });

    if (!resolved.ok) {
      throw new Error(resolved.error);
    }

    const completed = await completeWalletActivation(resolved.data, "connection-oob", "credential-record-oob");

    expect(completed).toMatchObject({
      ok: true,
      data: {
        activationId: resolved.data.activationId,
        credentialRecordId: "credential-record-oob",
        holderConnectionId: "connection-oob",
      },
    });
  });

  it("surfaces admin API token errors instead of falling back", async () => {
    process.env.EXPO_PUBLIC_UNIFY_ADMIN_API_BASE_URL = "http://localhost:3000";
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse(
        {
          error: {
            code: "ActivationTokenNotFound",
            message: "Activation token was not found.",
            requestId: "mock-wallet-activation-resolve",
          },
        },
        false,
        404,
      ),
    );

    const resolved = await resolveWalletActivation({
      kind: "token",
      sourceUrl: "unifywallet://activate?token=missing-token",
      token: "missing-token",
    });

    expect(resolved).toEqual({ ok: false, error: "Activation token was not found." });
  });
});
