import { deleteSecureValue, getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

import { type PersistedWalletSessionState, signedOutSession } from "./sessionTypes";

export const WALLET_SESSION_STORAGE_KEY = "unify.wallet.session.v1";

export function serializeWalletSessionState(state: PersistedWalletSessionState) {
  return JSON.stringify(state);
}

export function parseWalletSessionState(rawValue: string | null): PersistedWalletSessionState {
  if (!rawValue) {
    return {
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      onboardingCompleted: true,
      session: signedOutSession,
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PersistedWalletSessionState>;
    const pendingCheckout = parsed.pendingCheckoutVerification;
    const claimedSession = pendingCheckout?.claimedSession;
    const parsedClaimedSession =
      typeof claimedSession?.verificationRequestId === "string" &&
      typeof claimedSession.invitationUrl === "string" &&
      typeof claimedSession.resultToken === "string" &&
      typeof claimedSession.vendorName === "string" &&
      typeof claimedSession.servicePointName === "string" &&
      Array.isArray(claimedSession.requestedAttributes) &&
      claimedSession.requestedAttributes.every((attribute: unknown) => typeof attribute === "string") &&
      typeof claimedSession.expiresAt === "string"
        ? claimedSession
        : undefined;

    return {
      biometricEnabled: Boolean(parsed.biometricEnabled),
      changePinAttempts: parsed.changePinAttempts ?? 0,
      failedAttempts: parsed.failedAttempts ?? 0,
      // Existing wallets must never be surprised by first-run education after an update.
      onboardingCompleted:
        typeof parsed.onboardingCompleted === "boolean" ? parsed.onboardingCompleted : true,
      pinHash: parsed.pinHash,
      pinSalt: parsed.pinSalt,
      pendingActivationUrl:
        typeof parsed.pendingActivationUrl === "string" ? parsed.pendingActivationUrl : undefined,
      pendingCheckoutVerification:
        typeof pendingCheckout?.verificationRequestId === "string" &&
        typeof pendingCheckout.claimToken === "string"
          ? {
              verificationRequestId: pendingCheckout.verificationRequestId,
              claimToken: pendingCheckout.claimToken,
              ...(parsedClaimedSession ? { claimedSession: parsedClaimedSession } : {}),
            }
          : undefined,
      pendingVerificationPublicServicePointId:
        typeof parsed.pendingVerificationPublicServicePointId === "string"
          ? parsed.pendingVerificationPublicServicePointId
          : undefined,
      session: {
        authStatus: parsed.session?.authStatus ?? "signedOut",
        lockStatus: parsed.session?.lockStatus ?? "locked",
        pendingOfferIds: Array.isArray(parsed.session?.pendingOfferIds) ? parsed.session.pendingOfferIds : [],
        walletId: parsed.session?.walletId,
      },
    };
  } catch {
    return {
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      onboardingCompleted: true,
      session: signedOutSession,
    };
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
