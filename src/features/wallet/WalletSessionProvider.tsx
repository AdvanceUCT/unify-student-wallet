import * as LocalAuthentication from "expo-local-authentication";
import { router, useSegments } from "expo-router";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { parseActivationLink } from "./activationLinks";
import { completeWalletActivation, resolveWalletActivation, type ResolvedWalletActivation } from "./activationResolver";
import { acceptHolderActivation, type HolderActivationResult } from "./holderAgent";
import { createPinSalt, hashPin, validatePinConfirmation, verifyPin } from "./pin";
import { getWalletRouteAccess, getWalletRouteHref, isRouteAllowedForAccess } from "./routeGuards";
import { clearWalletSessionState, loadWalletSessionState, saveWalletSessionState } from "./sessionStorage";
import {
  DEMO_STUDENT_ID,
  DEMO_WALLET_ID,
  hasStoredPin,
  type PersistedWalletSessionState,
  signedOutSession,
  type WalletSession,
} from "./sessionTypes";

type ActionResult = { ok: true } | { ok: false; error: string };
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
  continueMockSession: () => Promise<void>;
  hasPin: boolean;
  isHydrated: boolean;
  lockWallet: () => Promise<void>;
  prepareActivationFromLink: (url: string) => Promise<ActionResult>;
  session: WalletSession;
  setBiometricEnabled: (enabled: boolean) => Promise<ActionResult>;
  setPin: (pin: string, confirmation: string) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  unlockWithBiometric: () => Promise<ActionResult>;
  unlockWithPin: (pin: string) => Promise<ActionResult>;
};

const WalletSessionContext = createContext<WalletSessionContextValue | null>(null);

const initialState: WalletProviderState = {
  biometricAvailable: false,
  biometricEnabled: false,
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

      if (isMounted) {
        setState({
          ...lockedState,
          biometricAvailable,
          biometricEnabled: lockedState.biometricEnabled && biometricAvailable,
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
    [persistState, state.biometricEnabled, state.pinHash, state.pinSalt],
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
      pinHash: state.pinHash,
      pinSalt: state.pinSalt,
      session: {
        authStatus: "signedIn",
        activationStatus: "notActivated",
        lockStatus: "locked",
        studentId: DEMO_STUDENT_ID,
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

      if (!(await verifyPin(pin, state.pinSalt, state.pinHash))) {
        return { ok: false, error: "Incorrect PIN." };
      }

      await persistState({
        biometricEnabled: state.biometricEnabled,
        pinHash: state.pinHash,
        pinSalt: state.pinSalt,
        session: { ...state.session, lockStatus: "unlocked" },
      });

      return { ok: true };
    },
    [persistState, state.biometricEnabled, state.pinHash, state.pinSalt, state.session],
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
      pinHash: state.pinHash,
      pinSalt: state.pinSalt,
      session: { ...state.session, lockStatus: "unlocked" },
    });

    return { ok: true };
  }, [persistState, state.biometricAvailable, state.biometricEnabled, state.pinHash, state.pinSalt, state.session]);

  const setBiometricEnabled = useCallback(
    async (enabled: boolean): Promise<ActionResult> => {
      if (enabled && !state.biometricAvailable) {
        return { ok: false, error: "Biometric unlock is not available on this device." };
      }

      await persistState({
        biometricEnabled: enabled,
        pinHash: state.pinHash,
        pinSalt: state.pinSalt,
        session: state.session,
      });

      return { ok: true };
    },
    [persistState, state.biometricAvailable, state.pinHash, state.pinSalt, state.session],
  );

  const lockWallet = useCallback(async () => {
    await persistState({
      biometricEnabled: state.biometricEnabled,
      pinHash: state.pinHash,
      pinSalt: state.pinSalt,
      session: { ...state.session, lockStatus: "locked" },
    });
  }, [persistState, state.biometricEnabled, state.pinHash, state.pinSalt, state.session]);

  const signOut = useCallback(async () => {
    await clearWalletSessionState();
    setState((current) => ({
      ...current,
      biometricEnabled: false,
      pinHash: undefined,
      pinSalt: undefined,
      session: signedOutSession,
    }));
  }, []);

  const value = useMemo<WalletSessionContextValue>(
    () => ({
      biometricAvailable: state.biometricAvailable,
      biometricEnabled: state.biometricEnabled,
      continueMockSession,
      hasPin: hasStoredPin(state),
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

export type { WalletSession };
