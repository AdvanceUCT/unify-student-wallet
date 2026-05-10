import { resolveWalletActivation } from "@/src/features/wallet/activationResolver";

const originalFetch = global.fetch;
const originalAgentApiBaseUrl = process.env.EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL;

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
    process.env.EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL = originalAgentApiBaseUrl;
    jest.clearAllMocks();
  });

  it("uses the agent service resolve API with the configured base URL", async () => {
    process.env.EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL = "http://localhost:3001/";
    global.fetch = jest.fn().mockResolvedValueOnce(
      mockResponse({
        activationId: "activation-7MFK2Q9V",
        activationSource: "token",
        createdAt: "2026-04-27T10:00:00.000Z",
        credentialExchangeId: "issuer-exchange-001",
        expiresAt: "2026-04-28T10:00:00.000Z",
        invitationId: "unify-oob-7MFK2Q9V",
        invitationUrl: "https://issuer.advanceuct.test/oob?oob=real",
        issuerLabel: "UNIFY Issuer Service",
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
      "http://localhost:3001/api/wallet/activation/resolve",
      expect.objectContaining({
        body: JSON.stringify({
          kind: "token",
          sourceUrl: "unifywallet://activate?token=mock-act-7MFK2Q9V",
          token: "mock-act-7MFK2Q9V",
        }),
        method: "POST",
      }),
    );
    expect(resolved.data).toEqual({
      activationId: "activation-7MFK2Q9V",
      activationSource: "token",
      createdAt: "2026-04-27T10:00:00.000Z",
      credentialExchangeId: "issuer-exchange-001",
      expiresAt: "2026-04-28T10:00:00.000Z",
      invitationId: "unify-oob-7MFK2Q9V",
      invitationUrl: "https://issuer.advanceuct.test/oob?oob=real",
      issuerLabel: "UNIFY Issuer Service",
    });
  });

  it("falls back to localhost:3002 when no env override is set", async () => {
    delete process.env.EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL;
    global.fetch = jest.fn().mockResolvedValueOnce(
      mockResponse({
        activationId: "activation-default",
        activationSource: "token",
        createdAt: "2026-04-27T10:00:00.000Z",
        invitationId: "unify-oob-default",
        invitationUrl: "https://issuer.advanceuct.test/oob?oob=real",
        issuerLabel: "UNIFY Issuer Service",
      }),
    );

    await resolveWalletActivation({
      kind: "token",
      sourceUrl: "unifywallet://activate?token=tok",
      token: "tok",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3002/api/wallet/activation/resolve",
      expect.any(Object),
    );
  });

  it("returns an activation service error when the configured agent API is unavailable", async () => {
    process.env.EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL = "http://localhost:3001";
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const resolved = await resolveWalletActivation({
      kind: "token",
      sourceUrl: "unifywallet://activate?token=offline-token",
      token: "offline-token",
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(resolved).toEqual({
      ok: false,
      error: "Activation service is unavailable. Check that the Credo agent service is running and try again.",
    });
  });

  it("keeps local OOB resolution for issuer development", async () => {
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
      },
    });
  });

  it("surfaces agent API token errors instead of unavailable messaging", async () => {
    process.env.EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL = "http://localhost:3001";
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse(
        {
          error: {
            code: "ActivationTokenNotFound",
            message: "Activation token was not found.",
            requestId: "agent-wallet-activation-resolve",
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
