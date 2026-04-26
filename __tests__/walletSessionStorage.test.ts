import { parseWalletSessionState, serializeWalletSessionState } from "@/src/features/wallet/sessionStorage";
import type { PersistedWalletSessionState } from "@/src/features/wallet/sessionTypes";

describe("wallet session storage serialization", () => {
  it("round-trips persisted session state", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: true,
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

  it("does not require raw activation tokens or out-of-band URLs in persisted state", () => {
    const state: PersistedWalletSessionState = {
      biometricEnabled: false,
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
