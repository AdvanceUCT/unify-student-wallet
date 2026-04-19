import { deleteSecureValue, getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

import { type PersistedWalletSessionState, signedOutSession } from "./sessionTypes";

export const WALLET_SESSION_STORAGE_KEY = "unify.wallet.session.v1";

export function serializeWalletSessionState(state: PersistedWalletSessionState) {
  return JSON.stringify(state);
}

export function parseWalletSessionState(rawValue: string | null): PersistedWalletSessionState {
  if (!rawValue) {
    return { biometricEnabled: false, session: signedOutSession };
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PersistedWalletSessionState>;

    return {
      biometricEnabled: Boolean(parsed.biometricEnabled),
      pinHash: parsed.pinHash,
      pinSalt: parsed.pinSalt,
      session: {
        authStatus: parsed.session?.authStatus ?? "signedOut",
        activationStatus: parsed.session?.activationStatus ?? "notActivated",
        lockStatus: parsed.session?.lockStatus ?? "locked",
        studentId: parsed.session?.studentId,
        walletId: parsed.session?.walletId,
      },
    };
  } catch {
    return { biometricEnabled: false, session: signedOutSession };
  }
}

export async function loadWalletSessionState() {
  return parseWalletSessionState(await getSecureValue(WALLET_SESSION_STORAGE_KEY));
}

export async function saveWalletSessionState(state: PersistedWalletSessionState) {
  await saveSecureValue(WALLET_SESSION_STORAGE_KEY, serializeWalletSessionState(state));
}

export async function clearWalletSessionState() {
  await deleteSecureValue(WALLET_SESSION_STORAGE_KEY);
}
