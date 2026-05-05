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
      session: {
        activationId: "activation-demo",
        activationInvitationId: "unify-oob-demo",
        activationSource: "token",
        authStatus: "signedIn",
        activationStatus: "activated",
        credentialRecordId: "credential-demo",
        holderConnectionId: "connection-demo",
        lockStatus: "unlocked",
        studentId: "student-demo-001",
        walletId: "wallet-demo-001",
      },
    };

    expect(parseWalletSessionState(serializeWalletSessionState(state))).toEqual(state);
  });

  it("falls back to signed-out state for missing or invalid storage", () => {
    expect(parseWalletSessionState(null).session.authStatus).toBe("signedOut");
    expect(parseWalletSessionState("not-json").session.authStatus).toBe("signedOut");
  });

  it("defaults failedAttempts to 0 when missing from stored data", () => {
    const legacyState = {
      biometricEnabled: false,
      pinHash: "hash",
      pinSalt: "salt",
      session: {
        authStatus: "signedIn",
        activationStatus: "activated",
        lockStatus: "locked",
        studentId: "student-demo-001",
        walletId: "wallet-demo-001",
      },
    };

    const parsed = parseWalletSessionState(JSON.stringify(legacyState));
    expect(parsed.failedAttempts).toBe(0);
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
        activationStatus: "activated",
        lockStatus: "locked",
        studentId: "student-demo-001",
        walletId: "wallet-demo-001",
      },
    };

    expect(parseWalletSessionState(serializeWalletSessionState(state))).toEqual(state);
  });

  it("does not require raw activation tokens or out-of-band URLs in persisted state", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      session: {
        activationId: "activation-demo",
        activationInvitationId: "unify-oob-demo",
        activationSource: "oob",
        authStatus: "signedIn",
        activationStatus: "activationPending",
        lockStatus: "locked",
        studentId: "student-demo-001",
        walletId: "wallet-demo-001",
      },
    };

    const serialized = serializeWalletSessionState(state);

    expect(serialized).not.toContain("raw-token");
    expect(serialized).not.toContain("https://issuer.advanceuct.test/oob");
    expect(parseWalletSessionState(serialized)).toEqual(state);
  });
});
