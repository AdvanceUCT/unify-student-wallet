import type { WalletSession } from "./sessionTypes";

export type WalletRouteAccess = "welcome" | "pinSetup" | "unlock" | "wallet";

export function getWalletRouteAccess(session: WalletSession, hasPin: boolean): WalletRouteAccess {
  if (!session.walletId) {
    if (hasPin) {
      return "pinSetup";
    }
    return "welcome";
  }

  if (!hasPin) {
    return "pinSetup";
  }

  if (session.lockStatus === "locked") {
    return "unlock";
  }

  return "wallet";
}

export function getWalletRouteHref(access: WalletRouteAccess) {
  switch (access) {
    case "welcome":
      return "/(auth)/sign-in" as const;
    case "pinSetup":
      return "/(auth)/set-pin" as const;
    case "unlock":
      return "/(auth)/unlock" as const;
    case "wallet":
      return "/(wallet)/home" as const;
  }
}

export function isRouteAllowedForAccess(segments: string[], access: WalletRouteAccess) {
  const lastSegment = segments.at(-1);

  switch (access) {
    case "welcome":
      return lastSegment === "sign-in" || lastSegment === "set-pin" || lastSegment === "activate";
    case "pinSetup":
      return lastSegment === "set-pin" || lastSegment === "activate";
    case "unlock":
      return lastSegment === "unlock" || lastSegment === "activate";
    case "wallet":
      return (
        segments.includes("(wallet)") ||
        ["home", "credential", "scan", "payments", "settings", "offers", "change-pin", "activate"].includes(
          lastSegment ?? "",
        )
      );
  }
}
