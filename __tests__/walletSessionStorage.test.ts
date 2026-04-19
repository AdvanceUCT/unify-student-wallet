import { parseWalletSessionState, serializeWalletSessionState } from "@/src/features/wallet/sessionStorage";
import type { PersistedWalletSessionState } from "@/src/features/wallet/sessionTypes";

describe("wallet session storage serialization", () => {
  it("round-trips persisted session state", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: true,
      pinHash: "hash",
      pinSalt: "salt",
      session: {
        authStatus: "signedIn",
        activationStatus: "activated",
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
});
