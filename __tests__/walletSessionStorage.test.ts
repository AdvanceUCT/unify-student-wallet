import { parseWalletSessionState, serializeWalletSessionState } from "@/src/features/wallet/sessionStorage";
import {
  mergePendingCheckoutVerification,
  type PersistedWalletSessionState,
} from "@/src/features/wallet/sessionTypes";

describe("wallet session storage serialization", () => {
  it("keeps a claimed invitation when the same checkout link is stashed during lock", () => {
    const claimed = {
      verificationRequestId: "verification-001",
      claimToken: "single-use-claim-token",
      claimedSession: {
        verificationRequestId: "verification-001",
        invitationUrl: "https://agent.example/oob/claimed",
        resultToken: "result-capability",
        vendorName: "Campus Store",
        servicePointName: "Main Branch",
        requestedAttributes: ["studentNumber"],
        expiresAt: "2026-08-08T12:05:00.000Z",
      },
    };

    expect(
      mergePendingCheckoutVerification(claimed, {
        verificationRequestId: "verification-001",
        claimToken: "single-use-claim-token",
      }),
    ).toEqual(claimed);
    expect(mergePendingCheckoutVerification(claimed, undefined)).toBeUndefined();
  });

  it("round-trips persisted session state", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: true,
      changePinAttempts: 0,
      failedAttempts: 0,
      onboardingCompleted: false,
      pinHash: "hash",
      pinSalt: "salt",
      pendingActivationUrl: "unifywallet://activate?token=activation-001",
      pendingCheckoutVerification: {
        verificationRequestId: "verification-001",
        claimToken: "single-use-claim-token",
        claimedSession: {
          verificationRequestId: "verification-001",
          invitationUrl: "https://agent.example/oob/claimed",
          resultToken: "result-capability",
          vendorName: "Campus Store",
          servicePointName: "Main Branch",
          requestedAttributes: ["studentNumber", "faculty"],
          expiresAt: "2026-08-08T12:05:00.000Z",
        },
      },
      pendingVerificationPublicServicePointId: "sp-public-001",
      session: {
        authStatus: "signedIn",
        lockStatus: "unlocked",
        pendingOfferIds: ["offer-1", "offer-2"],
        walletId: "wallet-uuid-001",
      },
    };

    expect(parseWalletSessionState(serializeWalletSessionState(state))).toEqual(state);
  });

  it("keeps a pending checkout claim in secure session storage until unlock", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      onboardingCompleted: true,
      pendingCheckoutVerification: {
        verificationRequestId: "verification-001",
        claimToken: "single-use-claim-token",
      },
      session: { authStatus: "signedIn", lockStatus: "locked", pendingOfferIds: [] },
    };

    expect(parseWalletSessionState(serializeWalletSessionState(state))).toEqual(state);
  });

  it("drops malformed claimed session data without losing the original claim capability", () => {
    const parsed = parseWalletSessionState(JSON.stringify({
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      onboardingCompleted: true,
      pendingCheckoutVerification: {
        verificationRequestId: "verification-001",
        claimToken: "single-use-claim-token",
        claimedSession: { invitationUrl: 42, resultToken: "result-capability" },
      },
      session: { authStatus: "signedIn", lockStatus: "locked", pendingOfferIds: [] },
    }));

    expect(parsed.pendingCheckoutVerification).toEqual({
      verificationRequestId: "verification-001",
      claimToken: "single-use-claim-token",
    });
  });

  it("persists a pending verification service point without result capabilities", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      onboardingCompleted: true,
      pendingVerificationPublicServicePointId: "sp-public-001",
      session: { authStatus: "signedOut", lockStatus: "locked", pendingOfferIds: [] },
    };

    const serialized = serializeWalletSessionState(state);
    expect(parseWalletSessionState(serialized).pendingVerificationPublicServicePointId).toBe("sp-public-001");
    expect(serialized).not.toContain("resultToken");
  });

  it("falls back to signed-out state for missing or invalid storage", () => {
    expect(parseWalletSessionState(null).session.authStatus).toBe("signedOut");
    expect(parseWalletSessionState(null).onboardingCompleted).toBe(true);
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
    expect(parsed.onboardingCompleted).toBe(true);
    expect(parsed.session.pendingOfferIds).toEqual([]);
  });

  it("preserves non-zero failedAttempts through round-trip", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 3,
      onboardingCompleted: true,
      pinHash: "hash",
      pinSalt: "salt",
      session: {
        authStatus: "signedIn",
        lockStatus: "locked",
        pendingOfferIds: [],
        walletId: "wallet-uuid-001",
      },
    };

    expect(parseWalletSessionState(serializeWalletSessionState(state))).toEqual(state);
  });

  it("keeps activation URLs optional when there is no pending activation", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      onboardingCompleted: true,
      session: {
        authStatus: "signedIn",
        lockStatus: "locked",
        pendingOfferIds: [],
        walletId: "wallet-uuid-001",
      },
    };

    const serialized = serializeWalletSessionState(state);

    expect(serialized).not.toContain("raw-token");
    expect(serialized).not.toContain("https://issuer.advanceuct.test/oob");
    expect(parseWalletSessionState(serialized)).toEqual(state);
  });
});
