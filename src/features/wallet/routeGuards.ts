import type { WalletSession } from "./sessionTypes";

export type WalletRouteAccess = "signIn" | "activation" | "pinSetup" | "unlock" | "wallet";

export function getWalletRouteAccess(session: WalletSession, hasPin: boolean): WalletRouteAccess {
  if (session.authStatus === "signedOut") {
    return "signIn";
  }

  if (session.activationStatus === "notActivated") {
    return "activation";
  }

  if (session.activationStatus === "activationPending" && !hasPin) {
    return "pinSetup";
  }

  if (session.activationStatus !== "activated") {
    return "activation";
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
    case "signIn":
      return "/(auth)/sign-in" as const;
    case "activation":
      return "/(auth)/activate" as const;
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
    case "signIn":
      return lastSegment === "sign-in";
    case "activation":
      return lastSegment === "activate";
    case "pinSetup":
      return lastSegment === "set-pin";
    case "unlock":
      return lastSegment === "unlock";
    case "wallet":
      return segments.includes("(wallet)") || ["home", "credential", "scan", "payments", "settings"].includes(lastSegment ?? "");
  }
}
