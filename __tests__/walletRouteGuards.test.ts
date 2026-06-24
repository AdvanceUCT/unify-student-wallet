import { getWalletRouteAccess, getWalletRouteHref, isRouteAllowedForAccess } from "@/src/features/wallet/routeGuards";
import type { WalletSession } from "@/src/features/wallet/sessionTypes";

function session(overrides: Partial<WalletSession>): WalletSession {
  return {
    authStatus: "signedOut",
    lockStatus: "locked",
    pendingOfferIds: [],
    ...overrides,
  };
}

describe("wallet route guards", () => {
  it("routes users without a wallet to welcome", () => {
    const access = getWalletRouteAccess(session({}), false);

    expect(access).toBe("welcome");
    expect(getWalletRouteHref(access)).toBe("/(auth)/sign-in");
    expect(isRouteAllowedForAccess(["(auth)", "sign-in"], access)).toBe(true);
    expect(isRouteAllowedForAccess(["(auth)", "set-pin"], access)).toBe(true);
    expect(isRouteAllowedForAccess(["(auth)", "activate"], access)).toBe(true);
  });

  it("routes users without a wallet but with a stored PIN to PIN setup", () => {
    const access = getWalletRouteAccess(session({}), true);

    expect(access).toBe("pinSetup");
    expect(getWalletRouteHref(access)).toBe("/(auth)/set-pin");
  });

  it("routes users with a wallet but no PIN to PIN setup", () => {
    const access = getWalletRouteAccess(
      session({ authStatus: "signedIn", walletId: "wallet-uuid" }),
      false,
    );

    expect(access).toBe("pinSetup");
    expect(getWalletRouteHref(access)).toBe("/(auth)/set-pin");
  });

  it("routes users with a wallet and PIN but locked to unlock", () => {
    const access = getWalletRouteAccess(
      session({ authStatus: "signedIn", walletId: "wallet-uuid", lockStatus: "locked" }),
      true,
    );

    expect(access).toBe("unlock");
    expect(getWalletRouteHref(access)).toBe("/(auth)/unlock");
    expect(isRouteAllowedForAccess(["(auth)", "unlock"], access)).toBe(true);
  });

  it("allows wallet tabs once the wallet is unlocked", () => {
    const access = getWalletRouteAccess(
      session({ authStatus: "signedIn", walletId: "wallet-uuid", lockStatus: "unlocked" }),
      true,
    );

    expect(access).toBe("wallet");
    expect(isRouteAllowedForAccess(["(wallet)", "home"], access)).toBe(true);
    expect(isRouteAllowedForAccess(["(wallet)", "offers"], access)).toBe(true);
    expect(isRouteAllowedForAccess(["(auth)", "change-pin"], access)).toBe(true);
    expect(isRouteAllowedForAccess(["verify", "[publicServicePointId]"], access)).toBe(true);
  });

  it("allows the activate route at every access level so links can route through", () => {
    const welcome = getWalletRouteAccess(session({}), false);
    const pinSetup = getWalletRouteAccess(
      session({ authStatus: "signedIn", walletId: "wallet-uuid" }),
      false,
    );
    const unlocked = getWalletRouteAccess(
      session({ authStatus: "signedIn", walletId: "wallet-uuid", lockStatus: "locked" }),
      true,
    );

    expect(isRouteAllowedForAccess(["(auth)", "activate"], welcome)).toBe(true);
    expect(isRouteAllowedForAccess(["(auth)", "activate"], pinSetup)).toBe(true);
    expect(isRouteAllowedForAccess(["(auth)", "activate"], unlocked)).toBe(true);
  });
});
