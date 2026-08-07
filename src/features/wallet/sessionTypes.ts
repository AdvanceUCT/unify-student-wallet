import type { VerificationHistoryItem } from "@/src/features/verification/history";

export type WalletAuthStatus = "signedOut" | "signedIn";
export type WalletLockStatus = "locked" | "unlocked";

export type PendingCheckoutVerification = {
  verificationRequestId: string;
  claimToken: string;
};

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
  pinHash?: string;
  pinSalt?: string;
  pendingCheckoutVerification?: PendingCheckoutVerification;
  pendingVerificationPublicServicePointId?: string;
  session: WalletSession;
  verificationHistory: VerificationHistoryItem[];
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
