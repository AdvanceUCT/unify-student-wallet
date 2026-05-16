import * as LocalAuthentication from "expo-local-authentication";
import { router, useSegments } from "expo-router";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { parseActivationLink, type ActivationLinkRequest } from "./activationLinks";
import { resolveWalletActivation } from "./activationResolver";
import {
  acceptCredentialOffer as agentAcceptCredentialOffer,
  declineCredentialOffer as agentDeclineCredentialOffer,
  receiveCredentialOffer as agentReceiveCredentialOffer,
  subscribeToOfferReceived,
} from "./holderAgent";
import { useHolderAgent } from "./HolderAgentProvider";
import { createPinSalt, hashPin, validateNewPin, validatePinConfirmation, verifyPin } from "./pin";
import { getWalletRouteAccess, getWalletRouteHref, isRouteAllowedForAccess } from "./routeGuards";
import { clearWalletSessionState, loadWalletSessionState, saveWalletSessionState } from "./sessionStorage";
import {
  hasStoredPin,
  isSessionHardLocked,
  MAX_CHANGE_PIN_ATTEMPTS,
  MAX_PIN_ATTEMPTS,
  type PersistedWalletSessionState,
  signedOutSession,
  type WalletSession,
} from "./sessionTypes";

type ActionResult = { ok: true; activationTarget?: "credential" | "offers" | "stashed" } | { ok: false; error: string };
type BiometricToggleResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; error: string; requiresPin: true };

type WalletProviderState = PersistedWalletSessionState & {
  biometricAvailable: boolean;
  isHydrated: boolean;
  stashedActivationUrl?: string;
};

type WalletSessionContextValue = {
  acceptOffer: (credentialRecordId: string) => Promise<ActionResult>;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  changePin: (currentPin: string, newPin: string, confirmation: string) => Promise<ActionResult>;
  confirmPinToDisableBiometric: (pin: string) => Promise<ActionResult>;
  createWallet: (pin: string, confirmation: string) => Promise<ActionResult>;
  declineOffer: (credentialRecordId: string) => Promise<ActionResult>;
  failedAttempts: number;
  hasPin: boolean;
  isHardLocked: boolean;
  isHydrated: boolean;
  lockWallet: () => Promise<void>;
  pendingOfferIds: string[];
  processIncomingLink: (url: string) => Promise<ActionResult>;
  session: WalletSession;
  setBiometricEnabled: (enabled: boolean) => Promise<BiometricToggleResult>;
  signOut: () => Promise<void>;
  stashedActivationUrl?: string;
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
  if (state.session.authStatus === "signedIn" && state.session.walletId && hasStoredPin(state)) {
    return { ...state, session: { ...state.session, lockStatus: "locked" } };
  }

  return state;
}

function actionErrorFromUnknown(error: unknown, fallback: string): { ok: false; error: string } {
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }

  return { ok: false, error: fallback };
}

function activationRequestKey(request: ActivationLinkRequest) {
  return request.kind === "token" ? `token:${request.token}` : `oob:${request.invitationUrl}`;
}

function isPendingCredentialOffer(record: { state?: string }) {
  return record.state === "offer-received";
}

function isStoredCredential(record: { state?: string }) {
  return record.state === "credential-received" || record.state === "done";
}

export function WalletSessionProvider({ children }: PropsWithChildren) {
  const { createWallet: createHolderWallet, resetAgent, resumeWallet } = useHolderAgent();
  const [state, setState] = useState<WalletProviderState>(initialState);
  const stateRef = useRef<WalletProviderState>(initialState);
  const activationProcessingRef = useRef<Map<string, Promise<ActionResult>>>(new Map());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      const [storedState, biometricAvailable] = await Promise.all([loadWalletSessionState(), canUseBiometricUnlock()]);
      const lockedState = lockHydratedSession(storedState);

      const biometricStillValid = biometricAvailable && lockedState.biometricEnabled;
      const resolvedBiometricEnabled = biometricStillValid;

      if (isMounted) {
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
    stateRef.current = { ...stateRef.current, ...nextState };
    setState((current) => ({ ...current, ...nextState }));
    await saveWalletSessionState(nextState);
  }, []);

  const addPendingOfferId = useCallback(async (credentialRecordId: string) => {
    const current = stateRef.current;

    if (current.session.pendingOfferIds.includes(credentialRecordId)) {
      return;
    }

    const next: PersistedWalletSessionState = {
      biometricEnabled: current.biometricEnabled,
      changePinAttempts: current.changePinAttempts,
      failedAttempts: current.failedAttempts,
      pinHash: current.pinHash,
      pinSalt: current.pinSalt,
      session: {
        ...current.session,
        pendingOfferIds: [...current.session.pendingOfferIds, credentialRecordId],
      },
    };

    stateRef.current = { ...stateRef.current, ...next };
    setState((curr) => ({ ...curr, ...next }));
    await saveWalletSessionState(next);
  }, []);

  const removePendingOfferId = useCallback(async (credentialRecordId: string) => {
    const current = stateRef.current;

    if (!current.session.pendingOfferIds.includes(credentialRecordId)) {
      return;
    }

    const next: PersistedWalletSessionState = {
      biometricEnabled: current.biometricEnabled,
      changePinAttempts: current.changePinAttempts,
      failedAttempts: current.failedAttempts,
      pinHash: current.pinHash,
      pinSalt: current.pinSalt,
      session: {
        ...current.session,
        pendingOfferIds: current.session.pendingOfferIds.filter((id) => id !== credentialRecordId),
      },
    };

    stateRef.current = { ...stateRef.current, ...next };
    setState((curr) => ({ ...curr, ...next }));
    await saveWalletSessionState(next);
  }, []);

  useEffect(() => {
    if (!state.session.walletId || state.session.lockStatus !== "unlocked") {
      return;
    }

    const unsubscribe = subscribeToOfferReceived((record) => {
      if (isPendingCredentialOffer(record)) {
        void addPendingOfferId(record.id);
        return;
      }

      if (isStoredCredential(record)) {
        void removePendingOfferId(record.id);
      }
    });

    return unsubscribe;
  }, [addPendingOfferId, removePendingOfferId, state.session.lockStatus, state.session.walletId]);

  const processIncomingLink = useCallback(
    async (url: string): Promise<ActionResult> => {
      const parsed = parseActivationLink(url);

      if (!parsed.ok) {
        return parsed;
      }

      const key = activationRequestKey(parsed.data);
      const existingProcess = activationProcessingRef.current.get(key);

      if (existingProcess) {
        return existingProcess;
      }

      const processActivation = (async (): Promise<ActionResult> => {
        const current = stateRef.current;

        if (!current.session.walletId) {
          stateRef.current = { ...stateRef.current, stashedActivationUrl: url };
          setState((curr) => ({ ...curr, stashedActivationUrl: url }));
          return { ok: true, activationTarget: "stashed" };
        }

        const resolved = await resolveWalletActivation(parsed.data);

        if (!resolved.ok) {
          return resolved;
        }

        try {
          const credentialRecord = await agentReceiveCredentialOffer(resolved.data.invitationUrl);

          if (isPendingCredentialOffer(credentialRecord)) {
            await addPendingOfferId(credentialRecord.id);
            return { ok: true, activationTarget: "offers" };
          }

          await removePendingOfferId(credentialRecord.id);
          return { ok: true, activationTarget: "credential" };
        } catch (error) {
          return actionErrorFromUnknown(error, "Credential offer could not be received.");
        }
      })();

      activationProcessingRef.current.set(key, processActivation);

      try {
        return await processActivation;
      } finally {
        activationProcessingRef.current.delete(key);
      }
    },
    [addPendingOfferId, removePendingOfferId],
  );

  const createWallet = useCallback(
    async (pin: string, confirmation: string): Promise<ActionResult> => {
      const validation = validatePinConfirmation(pin, confirmation);

      if (!validation.ok) {
        return validation;
      }

      const pinSalt = createPinSalt();
      const pinHash = await hashPin(pin, pinSalt);

      let walletId: string;
      try {
        const result = await createHolderWallet();
        walletId = result.walletId;
      } catch (error) {
        return actionErrorFromUnknown(error, "Wallet could not be created.");
      }

      const current = stateRef.current;
      const nextState: PersistedWalletSessionState = {
        biometricEnabled: current.biometricEnabled,
        changePinAttempts: current.changePinAttempts,
        failedAttempts: 0,
        pinHash,
        pinSalt,
        session: {
          authStatus: "signedIn",
          lockStatus: "unlocked",
          pendingOfferIds: current.session.pendingOfferIds,
          walletId,
        },
      };

      await persistState(nextState);

      const stashedUrl = current.stashedActivationUrl;

      if (stashedUrl) {
        stateRef.current = { ...stateRef.current, stashedActivationUrl: undefined };
        setState((curr) => ({ ...curr, stashedActivationUrl: undefined }));
        void processIncomingLink(stashedUrl);
      }

      return { ok: true };
    },
    [createHolderWallet, persistState, processIncomingLink],
  );

  const acceptOffer = useCallback(
    async (credentialRecordId: string): Promise<ActionResult> => {
      try {
        await agentAcceptCredentialOffer(credentialRecordId);
        await removePendingOfferId(credentialRecordId);
        router.replace("/(wallet)/credential");
        return { ok: true };
      } catch (error) {
        return actionErrorFromUnknown(error, "Credential offer could not be accepted.");
      }
    },
    [removePendingOfferId],
  );

  const declineOffer = useCallback(
    async (credentialRecordId: string): Promise<ActionResult> => {
      try {
        await agentDeclineCredentialOffer(credentialRecordId);
        await removePendingOfferId(credentialRecordId);
        return { ok: true };
      } catch (error) {
        return actionErrorFromUnknown(error, "Credential offer could not be declined.");
      }
    },
    [removePendingOfferId],
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

      if (state.session.walletId) {
        try {
          await resumeWallet(state.session.walletId);
        } catch (error) {
          return actionErrorFromUnknown(error, "Wallet could not be resumed.");
        }
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
    [persistState, resumeWallet, state],
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

    if (state.session.walletId) {
      try {
        await resumeWallet(state.session.walletId);
      } catch (error) {
        return actionErrorFromUnknown(error, "Wallet could not be resumed.");
      }
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
  }, [persistState, resumeWallet, state]);

  const setBiometricEnabled = useCallback(
    async (enabled: boolean): Promise<BiometricToggleResult> => {
      if (enabled) {
        const available = await canUseBiometricUnlock();

        if (!available) {
          return {
            ok: false,
            error: "Biometrics are not available or not enrolled on this device. Please enrol in your device settings.",
          };
        }

        const result = await LocalAuthentication.authenticateAsync({
          cancelLabel: "Cancel",
          disableDeviceFallback: true,
          promptMessage: "Verify your identity to enable biometric unlock",
        });

        if (!result.success) {
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

      if (state.changePinAttempts >= MAX_CHANGE_PIN_ATTEMPTS) {
        return {
          ok: false,
          error: `Too many failed attempts. Sign out and sign back in to reset.`,
        };
      }

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

      const newPinValidation = validateNewPin(newPin);
      if (!newPinValidation.ok) {
        return newPinValidation;
      }

      if (newPin !== confirmation) {
        return { ok: false, error: "New PIN entries do not match." };
      }

      const isSameAsCurrent = await verifyPin(newPin, state.pinSalt, state.pinHash);
      if (isSameAsCurrent) {
        return { ok: false, error: "New PIN must be different from your current PIN." };
      }

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
    resetAgent();
    setState((current) => ({
      ...current,
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      pinHash: undefined,
      pinSalt: undefined,
      session: signedOutSession,
      stashedActivationUrl: undefined,
    }));
  }, [resetAgent]);

  const value = useMemo<WalletSessionContextValue>(
    () => ({
      acceptOffer,
      biometricAvailable: state.biometricAvailable,
      biometricEnabled: state.biometricEnabled,
      changePin,
      confirmPinToDisableBiometric,
      createWallet,
      declineOffer,
      failedAttempts: state.failedAttempts,
      hasPin: hasStoredPin(state),
      isHardLocked: isSessionHardLocked(state.failedAttempts),
      isHydrated: state.isHydrated,
      lockWallet,
      pendingOfferIds: state.session.pendingOfferIds,
      processIncomingLink,
      session: state.session,
      setBiometricEnabled,
      signOut,
      stashedActivationUrl: state.stashedActivationUrl,
      unlockWithBiometric,
      unlockWithPin,
    }),
    [
      acceptOffer,
      changePin,
      confirmPinToDisableBiometric,
      createWallet,
      declineOffer,
      lockWallet,
      processIncomingLink,
      setBiometricEnabled,
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
