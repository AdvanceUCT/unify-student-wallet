/**
 * @fileoverview Defines wallet session and resumable-flow state shared by providers and routes.
 * @module features/wallet/sessionTypes
 */

export type WalletAuthStatus = "signedOut" | "signedIn";
export type WalletLockStatus = "locked" | "unlocked";
export type FirstRunSetupStatus = "idle" | "preparing" | "creating" | "ready" | "error";

export type PendingCheckoutVerification = {
  verificationRequestId: string;
  claimToken: string;
  claimedSession?: {
    verificationRequestId: string;
    invitationUrl: string;
    resultToken: string;
    vendorName: string;
    servicePointName: string;
    requestedAttributes: string[];
    expiresAt: string;
  };
};

export type PendingFlowKind = "checkout" | "servicePoint" | "activation" | "offer" | "home";

export type PendingFlowContinuation =
  | { ok: true; kind: PendingFlowKind; href: string }
  | { ok: false; kind: Exclude<PendingFlowKind, "home">; error: string };

export type WalletSession = {
  authStatus: WalletAuthStatus;
  lockStatus: WalletLockStatus;
  pendingOfferIds: string[];
  walletId?: string;
};

export type PersistedWalletSessionState = {
  biometricEnabled: boolean;
  changePinAttempts: number;
  failedAttempts: number;
  onboardingCompleted: boolean;
  pinHash?: string;
  pinSalt?: string;
  pendingActivationUrl?: string;
  pendingCheckoutVerification?: PendingCheckoutVerification;
  pendingVerificationPublicServicePointId?: string;
  session: WalletSession;
};

export const MAX_PIN_ATTEMPTS = 5;
export const MAX_CHANGE_PIN_ATTEMPTS = 3;
export const MIN_PIN_LENGTH = 4;
export const MAX_PIN_LENGTH = 6;

export const signedOutSession: WalletSession = {
  authStatus: "signedOut",
  lockStatus: "locked",
  pendingOfferIds: [],
};

export function hasStoredPin(state: Pick<PersistedWalletSessionState, "pinHash" | "pinSalt">) {
  return Boolean(state.pinHash && state.pinSalt);
}

export function isSessionHardLocked(failedAttempts: number) {
  return failedAttempts >= MAX_PIN_ATTEMPTS;
}
