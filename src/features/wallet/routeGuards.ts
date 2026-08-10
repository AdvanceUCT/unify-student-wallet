/**
 * @fileoverview Chooses safe navigation targets from wallet setup, lock, and pending-flow state.
 * @module features/wallet/routeGuards
 */

import type { FirstRunSetupStatus, WalletSession } from "./sessionTypes";

export type WalletRouteAccess = "welcome" | "pinSetup" | "unlock" | "onboarding" | "wallet";

/** Reduces session state to the one route category the wallet may enter. */
export function getWalletRouteAccess(
  session: WalletSession,
  hasPin: boolean,
  onboardingCompleted = true,
  firstRunSetupStatus: FirstRunSetupStatus = "idle",
): WalletRouteAccess {
  if (firstRunSetupStatus !== "idle" && !session.walletId) {
    return "onboarding";
  }

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

  if (!onboardingCompleted) {
    return "onboarding";
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
    case "onboarding":
      return "/(auth)/onboarding" as const;
    case "wallet":
      return "/(wallet)/home" as const;
  }
}

export function isRouteAllowedForAccess(segments: string[], access: WalletRouteAccess) {
  const lastSegment = segments.at(-1);

  switch (access) {
    case "welcome":
      return ["sign-in", "set-pin", "activate", "restore"].includes(lastSegment ?? "");
    case "pinSetup":
      return lastSegment === "set-pin" || lastSegment === "activate";
    case "unlock":
      return lastSegment === "unlock" || lastSegment === "activate";
    case "onboarding":
      return lastSegment === "onboarding" || lastSegment === "activate";
    case "wallet":
      return (
        segments.includes("(wallet)") ||
        segments.includes("verify") ||
        ["home", "credential", "scan", "payments", "settings", "offers", "activity", "change-pin", "activate", "onboarding", "resume"].includes(
          lastSegment ?? "",
        )
      );
  }
}
