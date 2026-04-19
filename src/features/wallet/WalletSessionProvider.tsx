import * as LocalAuthentication from "expo-local-authentication";
import { router, useSegments } from "expo-router";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { createPinSalt, hashPin, validatePinConfirmation, verifyPin } from "./pin";
import { getWalletRouteAccess, getWalletRouteHref, isRouteAllowedForAccess } from "./routeGuards";
import { clearWalletSessionState, loadWalletSessionState, saveWalletSessionState } from "./sessionStorage";
import {
  DEMO_ACTIVATION_CODE,
  DEMO_STUDENT_ID,
  DEMO_WALLET_ID,
  hasStoredPin,
  type PersistedWalletSessionState,
  signedOutSession,
  type WalletSession,
} from "./sessionTypes";

type ActionResult = { ok: true } | { ok: false; error: string };

type WalletProviderState = PersistedWalletSessionState & {
  biometricAvailable: boolean;
  isHydrated: boolean;
};

type WalletSessionContextValue = {
  activateDemoWallet: (activationCode: string) => Promise<ActionResult>;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  hasPin: boolean;
  isHydrated: boolean;
  lockWallet: () => Promise<void>;
  session: WalletSession;
  setBiometricEnabled: (enabled: boolean) => Promise<ActionResult>;
  setPin: (pin: string, confirmation: string) => Promise<ActionResult>;
  signInDemo: () => Promise<void>;
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

export function WalletSessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<WalletProviderState>(initialState);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      const [storedState, biometricAvailable] = await Promise.all([loadWalletSessionState(), canUseBiometricUnlock()]);
      const lockedState = lockHydratedSession(storedState);

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

  const signInDemo = useCallback(async () => {
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

  const activateDemoWallet = useCallback(
    async (activationCode: string): Promise<ActionResult> => {
      if (activationCode.trim().toUpperCase() !== DEMO_ACTIVATION_CODE) {
        return { ok: false, error: "Enter the demo activation code." };
      }

      await persistState({
        biometricEnabled: state.biometricEnabled,
        pinHash: state.pinHash,
        pinSalt: state.pinSalt,
        session: {
          authStatus: "signedIn",
          activationStatus: "activated",
          lockStatus: "locked",
          studentId: state.session.studentId ?? DEMO_STUDENT_ID,
          walletId: DEMO_WALLET_ID,
        },
      });

      return { ok: true };
    },
    [persistState, state.biometricEnabled, state.pinHash, state.pinSalt, state.session.studentId],
  );

  const setPin = useCallback(
    async (pin: string, confirmation: string): Promise<ActionResult> => {
      const validation = validatePinConfirmation(pin, confirmation);

      if (!validation.ok) {
        return validation;
      }

      const pinSalt = createPinSalt();
      const pinHash = await hashPin(pin, pinSalt);

      await persistState({
        biometricEnabled: state.biometricEnabled,
        pinHash,
        pinSalt,
        session: {
          ...state.session,
          authStatus: "signedIn",
          activationStatus: "activated",
          lockStatus: "unlocked",
          studentId: state.session.studentId ?? DEMO_STUDENT_ID,
          walletId: state.session.walletId ?? DEMO_WALLET_ID,
        },
      });

      return { ok: true };
    },
    [persistState, state.biometricEnabled, state.session],
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
      activateDemoWallet,
      biometricAvailable: state.biometricAvailable,
      biometricEnabled: state.biometricEnabled,
      hasPin: hasStoredPin(state),
      isHydrated: state.isHydrated,
      lockWallet,
      session: state.session,
      setBiometricEnabled,
      setPin,
      signInDemo,
      signOut,
      unlockWithBiometric,
      unlockWithPin,
    }),
    [activateDemoWallet, lockWallet, setBiometricEnabled, setPin, signInDemo, signOut, state, unlockWithBiometric, unlockWithPin],
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
