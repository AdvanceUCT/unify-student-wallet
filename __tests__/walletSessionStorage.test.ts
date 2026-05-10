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
        authStatus: "signedIn",
        lockStatus: "unlocked",
        pendingOfferIds: ["offer-1", "offer-2"],
        walletId: "wallet-uuid-001",
      },
    };

    expect(parseWalletSessionState(serializeWalletSessionState(state))).toEqual(state);
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
    };

    const serialized = serializeWalletSessionState(state);

    expect(serialized).not.toContain("raw-token");
    expect(serialized).not.toContain("https://issuer.advanceuct.test/oob");
    expect(parseWalletSessionState(serialized)).toEqual(state);
  });
});
