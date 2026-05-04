import * as LocalAuthentication from "expo-local-authentication";
import { router, useSegments } from "expo-router";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { parseActivationLink } from "./activationLinks";
import { completeWalletActivation, resolveWalletActivation, type ResolvedWalletActivation } from "./activationResolver";
import { acceptHolderActivation, type HolderActivationResult } from "./holderAgent";
import { createPinSalt, hashPin, validateNewPin, validatePinConfirmation, verifyPin } from "./pin";
import { getWalletRouteAccess, getWalletRouteHref, isRouteAllowedForAccess } from "./routeGuards";
import { clearWalletSessionState, loadWalletSessionState, saveWalletSessionState } from "./sessionStorage";
import {
  DEMO_STUDENT_ID,
  DEMO_WALLET_ID,
  hasStoredPin,
  isSessionHardLocked,
  MAX_CHANGE_PIN_ATTEMPTS,
  MAX_PIN_ATTEMPTS,
  type PersistedWalletSessionState,
  signedOutSession,
  type WalletSession,
} from "./sessionTypes";

type ActionResult = { ok: true } | { ok: false; error: string };
type BiometricToggleResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; error: string; requiresPin: true };
type HolderActivationActionResult =
  | { data: HolderActivationResult; ok: true }
  | { error: string; ok: false };

type WalletProviderState = PersistedWalletSessionState & {
  biometricAvailable: boolean;
  isHydrated: boolean;
  pendingActivation?: ResolvedWalletActivation;
};

type WalletSessionContextValue = {
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  changePin: (currentPin: string, newPin: string, confirmation: string) => Promise<ActionResult>;
  continueMockSession: () => Promise<void>;
  failedAttempts: number;
  hasPin: boolean;
  isHardLocked: boolean;
  isHydrated: boolean;
  lockWallet: () => Promise<void>;
  prepareActivationFromLink: (url: string) => Promise<ActionResult>;
  session: WalletSession;
  confirmPinToDisableBiometric: (pin: string) => Promise<ActionResult>;
  setBiometricEnabled: (enabled: boolean) => Promise<BiometricToggleResult>;
  setPin: (pin: string, confirmation: string) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  unlockWithBiometric: () => Promise<ActionResult>;
  unlockWithPin: (pin: string) => Promise<ActionResult>;
};

const WalletSessionContext = createContext<WalletSessionContextValue | null>(null);

const initialState: WalletProviderState = {
  biometricAvailable: false,
  biometricEnabled: false,
  changePinAttempts: 0,
  failedAttempts: 0,
  isHydrated: false,
  session: signedOutSession,
};

async function canUseBiometricUnlock() {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);

  return hasHardware && isEnrolled;
}

function lockHydratedSession(state: PersistedWalletSessionState): PersistedWalletSessionState {
  if (state.session.authStatus === "signedIn" && state.session.activationStatus === "activated" && hasStoredPin(state)) {
    return { ...state, session: { ...state.session, lockStatus: "locked" } };
  }

  return state;
}

function clearTransientActivation(state: PersistedWalletSessionState): PersistedWalletSessionState {
  if (state.session.activationStatus !== "activationPending") {
    return state;
  }

  return {
    ...state,
    session: {
      authStatus: "signedIn",
      activationStatus: "notActivated",
      lockStatus: "locked",
      studentId: state.session.studentId,
    },
  };
}

function actionErrorFromUnknown(error: unknown): ActionResult {
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }

  return { ok: false, error: "Wallet activation could not be completed." };
}

async function tryAcceptHolderActivation(activation: ResolvedWalletActivation): Promise<HolderActivationActionResult> {
  try {
    return { data: await acceptHolderActivation(activation), ok: true };
  } catch (error) {
    const result = actionErrorFromUnknown(error);
    return result.ok ? { error: "Wallet activation could not be completed.", ok: false } : result;
  }
}

export function WalletSessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<WalletProviderState>(initialState);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      const [storedState, biometricAvailable] = await Promise.all([loadWalletSessionState(), canUseBiometricUnlock()]);
      const lockedState = lockHydratedSession(clearTransientActivation(storedState));

      // Graceful fallback (User Story 2, req 4):
      // If biometric was enabled but OS permission was revoked or hardware failed,
      // silently disable it so the app falls back to PIN on next launch without crashing.
      const biometricStillValid = biometricAvailable && lockedState.biometricEnabled;
      const resolvedBiometricEnabled = biometricStillValid;

      if (isMounted) {
        // If biometric was silently disabled due to revoked permission, persist the corrected state
        if (lockedState.biometricEnabled && !biometricAvailable) {
          const correctedState = { ...lockedState, biometricEnabled: false };
          await saveWalletSessionState(correctedState);
        }

        setState({
          ...lockedState,
          biometricAvailable,
          biometricEnabled: resolvedBiometricEnabled,
          isHydrated: true,
        });
      }
    }

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistState = useCallback(async (nextState: PersistedWalletSessionState) => {
    setState((current) => ({ ...current, ...nextState }));
    await saveWalletSessionState(nextState);
  }, []);

  const persistActivatedState = useCallback(
    async (activation: ResolvedWalletActivation, credentialRecordId: string, holderConnectionId: string) => {
      await persistState({
        biometricEnabled: state.biometricEnabled,
        changePinAttempts: state.changePinAttempts,
        failedAttempts: state.failedAttempts,
        pinHash: state.pinHash,
        pinSalt: state.pinSalt,
        session: {
          activationId: activation.activationId,
          activationInvitationId: activation.invitationId,
          activationSource: activation.activationSource,
          authStatus: "signedIn",
          activationStatus: "activated",
          credentialRecordId,
          holderConnectionId,
          lockStatus: "locked",
          studentId: activation.studentId,
          walletId: activation.walletId,
        },
      });

      setState((current) => ({ ...current, pendingActivation: undefined }));
    },
    [persistState, state.biometricEnabled, state.failedAttempts, state.pinHash, state.pinSalt],
  );

  const prepareResolvedActivation = useCallback(
    async (activation: ResolvedWalletActivation): Promise<ActionResult> => {
      if (hasStoredPin(state)) {
        const holderResult = await tryAcceptHolderActivation(activation);

        if (!holderResult.ok) {
          return holderResult;
        }

        const completion = await completeWalletActivation(
          activation,
          holderResult.data.holderConnectionId,
          holderResult.data.credentialRecordId,
        );

        if (!completion.ok) {
          return completion;
        }

        await persistActivatedState(
          activation,
          completion.data.credentialRecordId,
          completion.data.holderConnectionId,
        );
        return { ok: true };
      }

      await persistState({
        biometricEnabled: state.biometricEnabled,
        changePinAttempts: state.changePinAttempts,
        failedAttempts: state.failedAttempts,
        pinHash: state.pinHash,
        pinSalt: state.pinSalt,
        session: {
          activationId: activation.activationId,
          activationInvitationId: activation.invitationId,
          activationSource: activation.activationSource,
          authStatus: "signedIn",
          activationStatus: "activationPending",
          lockStatus: "locked",
          studentId: activation.studentId,
          walletId: activation.walletId,
        },
      });
      setState((current) => ({ ...current, pendingActivation: activation }));

      return { ok: true };
    },
    [persistActivatedState, persistState, state],
  );

  const continueMockSession = useCallback(async () => {
    await persistState({
      biometricEnabled: state.biometricEnabled,
      changePinAttempts: state.changePinAttempts,
      failedAttempts: 0,
      pinHash: state.pinHash,
      pinSalt: state.pinSalt,
      session: {
        authStatus: "signedIn",
        activationStatus: "activated",
        lockStatus: "locked",
        studentId: DEMO_STUDENT_ID,
        walletId: DEMO_WALLET_ID,
      },
    });
  }, [persistState, state.biometricEnabled, state.pinHash, state.pinSalt]);

  const prepareActivationFromLink = useCallback(
    async (url: string): Promise<ActionResult> => {
      const parsed = parseActivationLink(url);

      if (!parsed.ok) {
        return parsed;
      }

      const resolved = await resolveWalletActivation(parsed.data);

      if (!resolved.ok) {
        return resolved;
      }

      return prepareResolvedActivation(resolved.data);
    },
    [prepareResolvedActivation],
  );

  const setPin = useCallback(
    async (pin: string, confirmation: string): Promise<ActionResult> => {
      const validation = validatePinConfirmation(pin, confirmation);

      if (!validation.ok) {
        return validation;
      }

      const pinSalt = createPinSalt();
      const pinHash = await hashPin(pin, pinSalt);

      const nextPinState: PersistedWalletSessionState = {
        biometricEnabled: state.biometricEnabled,
        changePinAttempts: state.changePinAttempts,
        failedAttempts: 0,
        pinHash,
        pinSalt,
        session: {
          ...state.session,
          authStatus: "signedIn",
          lockStatus: "unlocked",
          studentId: state.session.studentId ?? DEMO_STUDENT_ID,
          walletId: state.session.walletId ?? DEMO_WALLET_ID,
        },
      };

      if (state.session.activationStatus === "activationPending") {
        const pendingActivation = state.pendingActivation;

        if (!pendingActivation) {
          return { ok: false, error: "Open the activation link again to finish credential storage." };
        }

        setState((current) => ({ ...current, ...nextPinState }));

        const holderResult = await tryAcceptHolderActivation(pendingActivation);

        if (!holderResult.ok) {
          return holderResult;
        }

        const completion = await completeWalletActivation(
          pendingActivation,
          holderResult.data.holderConnectionId,
          holderResult.data.credentialRecordId,
        );

        if (!completion.ok) {
          return completion;
        }

        const activatedState: PersistedWalletSessionState = {
          ...nextPinState,
          session: {
            ...nextPinState.session,
            activationId: pendingActivation.activationId,
            activationInvitationId: pendingActivation.invitationId,
            activationSource: pendingActivation.activationSource,
            activationStatus: "activated",
            credentialRecordId: completion.data.credentialRecordId,
            holderConnectionId: completion.data.holderConnectionId,
            lockStatus: "unlocked",
            studentId: pendingActivation.studentId,
            walletId: pendingActivation.walletId,
          },
        };

        await saveWalletSessionState(activatedState);
        setState((current) => ({
          ...current,
          ...activatedState,
          pendingActivation: undefined,
        }));

        return { ok: true };
      }

      await persistState({
        ...nextPinState,
        session: {
          ...nextPinState.session,
          activationStatus: "activated",
        },
      });

      return { ok: true };
    },
    [persistState, state],
  );

  const unlockWithPin = useCallback(
    async (pin: string): Promise<ActionResult> => {
      if (!state.pinHash || !state.pinSalt) {
        return { ok: false, error: "Set a PIN before unlocking this wallet." };
      }

      if (isSessionHardLocked(state.failedAttempts)) {
        return { ok: false, error: `Wallet locked after ${MAX_PIN_ATTEMPTS} failed attempts. Sign out to reset.` };
      }

      if (!(await verifyPin(pin, state.pinSalt, state.pinHash))) {
        const nextAttempts = state.failedAttempts + 1;

        await persistState({
          biometricEnabled: state.biometricEnabled,
          changePinAttempts: state.changePinAttempts,
          failedAttempts: nextAttempts,
          pinHash: state.pinHash,
          pinSalt: state.pinSalt,
          session: state.session,
        });

        if (isSessionHardLocked(nextAttempts)) {
          return {
            ok: false,
            error: `Wallet locked after ${MAX_PIN_ATTEMPTS} failed attempts. Sign out to reset.`,
          };
        }

        const remaining = MAX_PIN_ATTEMPTS - nextAttempts;
        return {
          ok: false,
          error: `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        };
      }

      await persistState({
        biometricEnabled: state.biometricEnabled,
        changePinAttempts: state.changePinAttempts,
        failedAttempts: 0,
        pinHash: state.pinHash,
        pinSalt: state.pinSalt,
        session: { ...state.session, lockStatus: "unlocked" },
      });

      return { ok: true };
    },
    [persistState, state],
  );

  const unlockWithBiometric = useCallback(async (): Promise<ActionResult> => {
    if (!state.biometricAvailable || !state.biometricEnabled) {
      return { ok: false, error: "Biometric unlock is not enabled." };
    }

    const result = await LocalAuthentication.authenticateAsync({
      cancelLabel: "Use PIN",
      disableDeviceFallback: false,
      promptMessage: "Unlock UNIFY wallet",
    });

    if (!result.success) {
      return { ok: false, error: "Biometric unlock was not completed." };
    }

    await persistState({
      biometricEnabled: state.biometricEnabled,
      changePinAttempts: state.changePinAttempts,
      failedAttempts: 0,
      pinHash: state.pinHash,
      pinSalt: state.pinSalt,
      session: { ...state.session, lockStatus: "unlocked" },
    });

    return { ok: true };
  }, [persistState, state]);

  const setBiometricEnabled = useCallback(
    async (enabled: boolean): Promise<BiometricToggleResult> => {
      // Hardware/enrollment check before allowing enable
      if (enabled) {
        const available = await canUseBiometricUnlock();

        if (!available) {
          return {
            ok: false,
            error: "Biometrics are not available or not enrolled on this device. Please enrol in your device settings.",
          };
        }

        // Prompt biometric verification before saving the preference
        const result = await LocalAuthentication.authenticateAsync({
          cancelLabel: "Cancel",
          disableDeviceFallback: true,
          promptMessage: "Verify your identity to enable biometric unlock",
        });

        if (!result.success) {
          // Handle OS-level denial vs. user cancellation vs. sensor lockout
          const errorCode = (result as { error?: string }).error;

          if (errorCode === "lockout" || errorCode === "lockout_permanent") {
            return {
              ok: false,
              error: "Biometric sensor is locked after too many failed attempts. Use your PIN to unlock your device first.",
            };
          }

          if (errorCode === "not_enrolled") {
            return {
              ok: false,
              error: "No biometrics enrolled. Please set up Face ID or fingerprint in your device settings.",
            };
          }

          return { ok: false, error: "Biometric verification was not completed. Biometric unlock was not enabled." };
        }

        await persistState({
          biometricEnabled: true,
          changePinAttempts: state.changePinAttempts,
          failedAttempts: state.failedAttempts,
          pinHash: state.pinHash,
          pinSalt: state.pinSalt,
          session: state.session,
        });

        return { ok: true };
      }

      // Disabling: signal that PIN verification is required — the UI will show the modal
      return { ok: false, error: "PIN required to disable biometric unlock.", requiresPin: true };
    },
    [persistState, state],
  );

  const confirmPinToDisableBiometric = useCallback(
    async (pin: string): Promise<ActionResult> => {
      if (!state.pinHash || !state.pinSalt) {
        return { ok: false, error: "No PIN set. Cannot verify identity." };
      }

      if (!(await verifyPin(pin, state.pinSalt, state.pinHash))) {
        return { ok: false, error: "Incorrect PIN. Please try again." };
      }

      await persistState({
        biometricEnabled: false,
        changePinAttempts: state.changePinAttempts,
        failedAttempts: state.failedAttempts,
        pinHash: state.pinHash,
        pinSalt: state.pinSalt,
        session: state.session,
      });

      return { ok: true };
    },
    [persistState, state],
  );

  const changePin = useCallback(
    async (currentPin: string, newPin: string, confirmation: string): Promise<ActionResult> => {
      if (!state.pinHash || !state.pinSalt) {
        return { ok: false, error: "No PIN is set. Please set a PIN first." };
      }

      // Enforce brute-force limit for the change-PIN flow (3 attempts)
      if (state.changePinAttempts >= MAX_CHANGE_PIN_ATTEMPTS) {
        return {
          ok: false,
          error: `Too many failed attempts. Sign out and sign back in to reset.`,
        };
      }

      // Step 1: Verify current PIN
      const isCurrentPinValid = await verifyPin(currentPin, state.pinSalt, state.pinHash);

      if (!isCurrentPinValid) {
        const nextAttempts = state.changePinAttempts + 1;
        await persistState({
          biometricEnabled: state.biometricEnabled,
          changePinAttempts: nextAttempts,
          failedAttempts: state.failedAttempts,
          pinHash: state.pinHash,
          pinSalt: state.pinSalt,
          session: state.session,
        });

        const remaining = MAX_CHANGE_PIN_ATTEMPTS - nextAttempts;
        if (remaining <= 0) {
          return {
            ok: false,
            error: `Too many failed attempts. Sign out and sign back in to reset.`,
          };
        }
        return {
          ok: false,
          error: `Incorrect current PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        };
      }

      // Step 2: Validate new PIN structure and weak-PIN check
      const newPinValidation = validateNewPin(newPin);
      if (!newPinValidation.ok) {
        return newPinValidation;
      }

      // Step 3: Confirm new PIN matches
      if (newPin !== confirmation) {
        return { ok: false, error: "New PIN entries do not match." };
      }

      // Step 4: Reject if new PIN is the same as current PIN
      const isSameAsCurrent = await verifyPin(newPin, state.pinSalt, state.pinHash);
      if (isSameAsCurrent) {
        return { ok: false, error: "New PIN must be different from your current PIN." };
      }

      // Step 5: Hash with a fresh salt and overwrite securely
      const newSalt = createPinSalt();
      const newHash = await hashPin(newPin, newSalt);

      await persistState({
        biometricEnabled: state.biometricEnabled,
        changePinAttempts: 0,
        failedAttempts: 0,
        pinHash: newHash,
        pinSalt: newSalt,
        session: state.session,
      });

      return { ok: true };
    },
    [persistState, state],
  );

  const lockWallet = useCallback(async () => {
    await persistState({
      biometricEnabled: state.biometricEnabled,
      changePinAttempts: state.changePinAttempts,
      failedAttempts: state.failedAttempts,
      pinHash: state.pinHash,
      pinSalt: state.pinSalt,
      session: { ...state.session, lockStatus: "locked" },
    });
  }, [persistState, state]);

  const signOut = useCallback(async () => {
    await clearWalletSessionState();
    setState((current) => ({
      ...current,
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      pinHash: undefined,
      pinSalt: undefined,
      session: signedOutSession,
    }));
  }, []);

  const value = useMemo<WalletSessionContextValue>(
    () => ({
      biometricAvailable: state.biometricAvailable,
      biometricEnabled: state.biometricEnabled,
      changePin,
      confirmPinToDisableBiometric,
      continueMockSession,
      failedAttempts: state.failedAttempts,
      hasPin: hasStoredPin(state),
      isHardLocked: isSessionHardLocked(state.failedAttempts),
      isHydrated: state.isHydrated,
      lockWallet,
      prepareActivationFromLink,
      session: state.session,
      setBiometricEnabled,
      setPin,
      signOut,
      unlockWithBiometric,
      unlockWithPin,
    }),
    [
      changePin,
      confirmPinToDisableBiometric,
      continueMockSession,
      lockWallet,
      prepareActivationFromLink,
      setBiometricEnabled,
      setPin,
      signOut,
      state,
      unlockWithBiometric,
      unlockWithPin,
    ],
  );

  return <WalletSessionContext.Provider value={value}>{children}</WalletSessionContext.Provider>;
}

export function WalletRouteGate({ children }: PropsWithChildren) {
  const { hasPin, isHydrated, session } = useWalletSession();
  const segments = useSegments();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const routeAccess = getWalletRouteAccess(session, hasPin);

    if (!isRouteAllowedForAccess(segments, routeAccess)) {
      router.replace(getWalletRouteHref(routeAccess));
    }
  }, [hasPin, isHydrated, segments, session]);

  return children;
}

export function useWalletSession() {
  const value = useContext(WalletSessionContext);

  if (!value) {
    throw new Error("useWalletSession must be used within WalletSessionProvider.");
  }

  return value;
}

export type { BiometricToggleResult, WalletSession };
