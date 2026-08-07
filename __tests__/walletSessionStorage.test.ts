import { parseWalletSessionState, serializeWalletSessionState } from "@/src/features/wallet/sessionStorage";
import type { PersistedWalletSessionState } from "@/src/features/wallet/sessionTypes";

describe("wallet session storage serialization", () => {
  it("round-trips persisted session state", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: true,
      changePinAttempts: 0,
      failedAttempts: 0,
      pinHash: "hash",
      pinSalt: "salt",
      pendingCheckoutVerification: {
        verificationRequestId: "verification-001",
        claimToken: "single-use-claim-token",
      },
      pendingVerificationPublicServicePointId: "sp-public-001",
      session: {
        authStatus: "signedIn",
        lockStatus: "unlocked",
        pendingOfferIds: ["offer-1", "offer-2"],
        walletId: "wallet-uuid-001",
      },
      verificationHistory: [
        {
          verificationRequestId: "verification-001",
          kind: "servicePoint",
          vendorName: "Campus Clinic",
          servicePointName: "Main desk",
          status: "Approved",
          expiresAt: "2026-06-23T10:05:00.000Z",
          completedAt: "2026-06-23T10:01:00.000Z",
          recordedAt: "2026-06-23T10:01:01.000Z",
        },
      ],
    };

    expect(parseWalletSessionState(serializeWalletSessionState(state))).toEqual(state);
  });

  it("keeps a pending checkout claim in secure session storage until unlock", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      pendingCheckoutVerification: {
        verificationRequestId: "verification-001",
        claimToken: "single-use-claim-token",
      },
      session: { authStatus: "signedIn", lockStatus: "locked", pendingOfferIds: [] },
      verificationHistory: [],
    };

    expect(parseWalletSessionState(serializeWalletSessionState(state))).toEqual(state);
  });

  it("persists a pending verification service point without result capabilities", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      pendingVerificationPublicServicePointId: "sp-public-001",
      session: { authStatus: "signedOut", lockStatus: "locked", pendingOfferIds: [] },
      verificationHistory: [],
    };

    const serialized = serializeWalletSessionState(state);
    expect(parseWalletSessionState(serialized).pendingVerificationPublicServicePointId).toBe("sp-public-001");
    expect(serialized).not.toContain("resultToken");
  });

  it("falls back to signed-out state for missing or invalid storage", () => {
    expect(parseWalletSessionState(null).session.authStatus).toBe("signedOut");
    expect(parseWalletSessionState("not-json").session.authStatus).toBe("signedOut");
  });

  it("defaults pendingOfferIds and failedAttempts when missing from stored data", () => {
    const legacyState = {
      biometricEnabled: false,
      pinHash: "hash",
      pinSalt: "salt",
      session: {
        authStatus: "signedIn",
        lockStatus: "locked",
        walletId: "wallet-uuid-001",
      },
    };

    const parsed = parseWalletSessionState(JSON.stringify(legacyState));
    expect(parsed.failedAttempts).toBe(0);
    expect(parsed.session.pendingOfferIds).toEqual([]);
    expect(parsed.verificationHistory).toEqual([]);
  });

  it("preserves non-zero failedAttempts through round-trip", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 3,
      pinHash: "hash",
      pinSalt: "salt",
      session: {
        authStatus: "signedIn",
        lockStatus: "locked",
        pendingOfferIds: [],
        walletId: "wallet-uuid-001",
      },
      verificationHistory: [],
    };

    expect(parseWalletSessionState(serializeWalletSessionState(state))).toEqual(state);
  });

  it("does not require raw activation tokens or out-of-band URLs in persisted state", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      session: {
        authStatus: "signedIn",
        lockStatus: "locked",
        pendingOfferIds: [],
        walletId: "wallet-uuid-001",
      },
      verificationHistory: [],
    };

    const serialized = serializeWalletSessionState(state);

    expect(serialized).not.toContain("raw-token");
    expect(serialized).not.toContain("https://issuer.advanceuct.test/oob");
    expect(parseWalletSessionState(serialized)).toEqual(state);
  });

  it("filters malformed verification history entries", () => {
    const parsed = parseWalletSessionState(JSON.stringify({
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      session: { authStatus: "signedIn", lockStatus: "locked", pendingOfferIds: [] },
      verificationHistory: [
        {
          verificationRequestId: "verification-001",
          kind: "servicePoint",
          vendorName: "Campus Clinic",
          servicePointName: "Main desk",
          status: "Approved",
          expiresAt: "2026-06-23T10:05:00.000Z",
          recordedAt: "2026-06-23T10:01:01.000Z",
        },
        {
          verificationRequestId: "verification-002",
          kind: "servicePoint",
          vendorName: "Campus Clinic",
          servicePointName: "Main desk",
          status: "Pending",
          expiresAt: "not-a-date",
          recordedAt: "2026-06-23T10:01:01.000Z",
        },
      ],
    }));

    expect(parsed.verificationHistory).toHaveLength(1);
    expect(parsed.verificationHistory[0]).toMatchObject({ verificationRequestId: "verification-001" });
  });

  it("persists verification history without requested attribute values", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      session: {
        authStatus: "signedIn",
        lockStatus: "locked",
        pendingOfferIds: [],
        walletId: "wallet-uuid-001",
      },
      verificationHistory: [
        {
          verificationRequestId: "verification-001",
          kind: "checkout",
          vendorName: "Campus Store",
          servicePointName: "Online checkout",
          status: "Declined",
          failureCode: "CREDENTIAL_NOT_CURRENT",
          expiresAt: "2026-06-23T10:05:00.000Z",
          completedAt: "2026-06-23T10:01:00.000Z",
          recordedAt: "2026-06-23T10:01:01.000Z",
        },
      ],
    };

    const serialized = serializeWalletSessionState(state);

    expect(serialized).not.toContain("studentNumber");
    expect(serialized).not.toContain("STU-12345");
    expect(parseWalletSessionState(serialized)).toEqual(state);
  });
});
