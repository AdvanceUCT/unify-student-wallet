import { getWalletRouteAccess, getWalletRouteHref, isRouteAllowedForAccess } from "@/src/features/wallet/routeGuards";
import type { WalletSession } from "@/src/features/wallet/sessionTypes";

function session(overrides: Partial<WalletSession>): WalletSession {
  return {
    authStatus: "signedOut",
    activationStatus: "notActivated",
    lockStatus: "locked",
    ...overrides,
  };
}

describe("wallet route guards", () => {
  it("routes signed-out users to sign-in", () => {
    const access = getWalletRouteAccess(session({}), false);

    expect(access).toBe("signIn");
    expect(getWalletRouteHref(access)).toBe("/(auth)/sign-in");
    expect(isRouteAllowedForAccess(["(auth)", "sign-in"], access)).toBe(true);
  });

  it("routes signed-in unactivated users to activation", () => {
    const access = getWalletRouteAccess(session({ authStatus: "signedIn" }), false);

    expect(access).toBe("activation");
    expect(getWalletRouteHref(access)).toBe("/(auth)/activate");
  });

  it("routes activated users without a PIN to PIN setup", () => {
    const access = getWalletRouteAccess(session({ authStatus: "signedIn", activationStatus: "activated" }), false);

    expect(access).toBe("pinSetup");
    expect(getWalletRouteHref(access)).toBe("/(auth)/set-pin");
  });

  it("routes activation-pending users without a PIN to PIN setup", () => {
    const access = getWalletRouteAccess(
      session({ authStatus: "signedIn", activationStatus: "activationPending" }),
      false,
    );

    expect(access).toBe("pinSetup");
    expect(getWalletRouteHref(access)).toBe("/(auth)/set-pin");
  });

  it("keeps activation-pending users on PIN setup while credential storage completes", () => {
    const access = getWalletRouteAccess(
      session({ authStatus: "signedIn", activationStatus: "activationPending" }),
      true,
    );

    expect(access).toBe("pinSetup");
    expect(getWalletRouteHref(access)).toBe("/(auth)/set-pin");
  });

  it("routes activated locked users with a PIN to unlock", () => {
    const access = getWalletRouteAccess(session({ authStatus: "signedIn", activationStatus: "activated" }), true);

    expect(access).toBe("unlock");
    expect(getWalletRouteHref(access)).toBe("/(auth)/unlock");
  });

  it("allows wallet tabs only after activation and unlock", () => {
    const access = getWalletRouteAccess(
      session({ authStatus: "signedIn", activationStatus: "activated", lockStatus: "unlocked" }),
      true,
    );

    expect(access).toBe("wallet");
    expect(isRouteAllowedForAccess(["(wallet)", "home"], access)).toBe(true);
    expect(isRouteAllowedForAccess(["(auth)", "unlock"], access)).toBe(false);
  });

  it("allows the change-pin screen for unlocked wallet access", () => {
    const access = getWalletRouteAccess(
      session({ authStatus: "signedIn", activationStatus: "activated", lockStatus: "unlocked" }),
      true,
    );

    expect(access).toBe("wallet");
    expect(isRouteAllowedForAccess(["(auth)", "change-pin"], access)).toBe(true);
  });
});
