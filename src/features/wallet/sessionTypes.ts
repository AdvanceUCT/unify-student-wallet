export type WalletAuthStatus = "signedOut" | "signedIn";
export type WalletActivationStatus = "notActivated" | "activationPending" | "activated";
export type WalletLockStatus = "locked" | "unlocked";

export type WalletSession = {
  activationId?: string;
  activationInvitationId?: string;
  activationSource?: "token" | "oob";
  authStatus: WalletAuthStatus;
  activationStatus: WalletActivationStatus;
  credentialRecordId?: string;
  holderConnectionId?: string;
  lockStatus: WalletLockStatus;
  studentId?: string;
  walletId?: string;
};

export type PersistedWalletSessionState = {
  biometricEnabled: boolean;
  pinHash?: string;
  pinSalt?: string;
  session: WalletSession;
};

export const DEMO_STUDENT_ID = "student-demo-001";
export const DEMO_WALLET_ID = "wallet-demo-001";

export const signedOutSession: WalletSession = {
  authStatus: "signedOut",
  activationStatus: "notActivated",
  lockStatus: "locked",
};

export function hasStoredPin(state: Pick<PersistedWalletSessionState, "pinHash" | "pinSalt">) {
  return Boolean(state.pinHash && state.pinSalt);
}
