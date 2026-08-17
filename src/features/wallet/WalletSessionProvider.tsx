/**
 * @fileoverview Owns wallet creation, restore, unlock, lock, reset, and pending-flow resumption.
 * @module features/wallet/WalletSessionProvider
 */

import * as LocalAuthentication from "expo-local-authentication";
import * as Linking from "expo-linking";
import { router, useSegments } from "expo-router";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager } from "react-native";

import { OperationStateScreen } from "@/src/components/OperationStateScreen";
import { createOrLoadEthereumWallet, getEthereumAddress } from "@/src/features/payment/ethereumWallet";
import { linkEthereumAddress } from "@/src/features/payment/paymentApi";
import { clearVerificationActivity } from "@/src/features/verification/activityHistory";
import { parseCheckoutVerificationLink, parseVerificationLink } from "@/src/lib/validation/qrPayload";

import { parseActivationLink, type ActivationLinkRequest } from "./activationLinks";
import { resolveWalletActivation } from "./activationResolver";
import { credentialAttributeValue } from "./credentialMetadata";
import { getStoredCredentialsLazy, loadHolderAgentRuntime } from "./holderAgentRuntime";
import { useHolderAgent } from "./HolderAgentProvider";
import { createPinSalt, hashPin, validateNewPin, validatePinConfirmation, verifyPin } from "./pin";
import { getWalletRouteAccess, getWalletRouteHref, isRouteAllowedForAccess } from "./routeGuards";
import { clearWalletSessionState, loadWalletSessionState, saveWalletSessionState } from "./sessionStorage";
import {
  hasStoredPin,
  isSessionHardLocked,
  MAX_CHANGE_PIN_ATTEMPTS,
  MAX_PIN_ATTEMPTS,
  type FirstRunSetupStatus,
  type PendingCheckoutVerification,
  type PendingFlowContinuation,
  type PendingFlowKind,
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
};

type FirstRunSetupDraft = {
  pinHash: string;
  pinSalt: string;
  walletId?: string;
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
  firstRunSetupError?: string;
  firstRunSetupStatus: FirstRunSetupStatus;
  hasPin: boolean;
  isHardLocked: boolean;
  isHydrated: boolean;
  lockWallet: () => Promise<void>;
  onboardingCompleted: boolean;
  pendingActivationUrl?: string;
  pendingOfferIds: string[];
  pendingCheckoutVerification?: PendingCheckoutVerification;
  pendingVerificationPublicServicePointId?: string;
  processIncomingLink: (url: string) => Promise<ActionResult>;
  completeOnboarding: () => Promise<void>;
  continuePendingFlow: () => Promise<PendingFlowContinuation>;
  clearPendingFlow: (kind: Exclude<PendingFlowKind, "home">) => Promise<void>;
  restoreWallet: (path: string, recoveryPassword: string) => Promise<ActionResult>;
  resetFirstRunSetup: () => Promise<void>;
  retryFirstRunSetup: () => Promise<ActionResult>;
  session: WalletSession;
  setBiometricEnabled: (enabled: boolean) => Promise<BiometricToggleResult>;
  setPendingCheckoutVerification: (request?: PendingCheckoutVerification) => Promise<void>;
  setPendingVerificationPublicServicePointId: (publicServicePointId?: string) => Promise<void>;
  signOut: () => Promise<void>;
  startFirstRunSetup: (pin: string, confirmation: string) => ActionResult;
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
  onboardingCompleted: true,
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

/** Links the device's Ethereum payment address to the student's number, if already known. Never blocks wallet creation. */
async function linkPaymentWalletBestEffort() {
  try {
    const ethWallet = await createOrLoadEthereumWallet();
    const credentials = await getStoredCredentialsLazy();
    const studentNumber = credentialAttributeValue(credentials[0] ?? {}, "studentNumber", "studentId");
    if (studentNumber) {
      await linkEthereumAddress(studentNumber, ethWallet.address);
    }
  } catch (error) {
    console.warn("[payment] Ethereum wallet link failed.", error);
  }
}

/**
 * Links the device's Ethereum payment address once the student's number is actually known.
 *
 * Wallet creation runs before any credential exists, so the earlier link attempt in
 * createWallet() usually no-ops. Accepting the first credential offer is the first point
 * studentNumber is available, so this retries the link then. Never blocks credential
 * acceptance.
 */
async function linkPaymentWalletForCredential(credentialRecordId: string) {
  try {
    const ethAddress = await getEthereumAddress();
    const credentials = await getStoredCredentialsLazy();
    const accepted = credentials.find((credential) => credential.id === credentialRecordId);
    const studentNumber = accepted && credentialAttributeValue(accepted, "studentNumber", "studentId");

    if (ethAddress && studentNumber) {
      const result = await linkEthereumAddress(studentNumber, ethAddress);
      if (!result.ok) {
        console.warn("[payment] Ethereum link failed.", result.error);
      }
    }
  } catch (error) {
    console.warn("[payment] Ethereum address linking failed.", error);
  }
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

function persistedStateFromProvider(state: WalletProviderState): PersistedWalletSessionState {
  const { biometricAvailable: _biometricAvailable, isHydrated: _isHydrated, ...persisted } = state;
  return persisted;
}

/** Provides the durable wallet lifecycle and security actions consumed by app routes. */
export function WalletSessionProvider({ children }: PropsWithChildren) {
  const {
    createWallet: createHolderWallet,
    ensureWalletReady,
    error: holderAgentError,
    preloadRuntime,
    resetAgent,
    restoreWallet: restoreHolderWallet,
  } = useHolderAgent();
  const [state, setState] = useState<WalletProviderState>(initialState);
  const stateRef = useRef<WalletProviderState>(initialState);
  const activationProcessingRef = useRef<Map<string, Promise<ActionResult>>>(new Map());
  const firstRunSetupDraftRef = useRef<FirstRunSetupDraft | null>(null);
  const firstRunSetupPromiseRef = useRef<Promise<ActionResult> | null>(null);
  const [firstRunSetupStatus, setFirstRunSetupStatus] = useState<FirstRunSetupStatus>("idle");
  const [firstRunSetupError, setFirstRunSetupError] = useState<string | undefined>();

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

  const persistState = useCallback(async (
    nextState: Omit<PersistedWalletSessionState, "onboardingCompleted"> &
      Partial<Pick<PersistedWalletSessionState, "onboardingCompleted">>,
  ) => {
    const mergedState: PersistedWalletSessionState = {
      ...nextState,
      onboardingCompleted: nextState.onboardingCompleted ?? stateRef.current.onboardingCompleted,
      ...(!Object.prototype.hasOwnProperty.call(nextState, "pendingVerificationPublicServicePointId")
        ? {
            pendingVerificationPublicServicePointId:
              stateRef.current.pendingVerificationPublicServicePointId,
          }
        : {}),
      ...(!Object.prototype.hasOwnProperty.call(nextState, "pendingCheckoutVerification")
        ? { pendingCheckoutVerification: stateRef.current.pendingCheckoutVerification }
        : {}),
      ...(!Object.prototype.hasOwnProperty.call(nextState, "pendingActivationUrl")
        ? { pendingActivationUrl: stateRef.current.pendingActivationUrl }
        : {}),
    };
    stateRef.current = { ...stateRef.current, ...mergedState };
    setState((current) => ({ ...current, ...mergedState }));
    await saveWalletSessionState(mergedState);
  }, []);

  const setPendingVerificationPublicServicePointId = useCallback(async (publicServicePointId?: string) => {
    const current = stateRef.current;
    const nextState: PersistedWalletSessionState = {
      biometricEnabled: current.biometricEnabled,
      changePinAttempts: current.changePinAttempts,
      failedAttempts: current.failedAttempts,
      onboardingCompleted: current.onboardingCompleted,
      pinHash: current.pinHash,
      pinSalt: current.pinSalt,
      pendingActivationUrl: current.pendingActivationUrl,
      pendingCheckoutVerification: current.pendingCheckoutVerification,
      pendingVerificationPublicServicePointId: publicServicePointId,
      session: current.session,
    };
    stateRef.current = { ...current, ...nextState };
    setState((value) => ({ ...value, ...nextState }));
    await saveWalletSessionState(nextState);
  }, []);

  useEffect(() => {
    if (!state.isHydrated) return;

    const shouldWarmRuntime = Boolean(
      state.session.walletId ||
      state.pendingActivationUrl ||
      state.pendingCheckoutVerification ||
      state.pendingVerificationPublicServicePointId ||
      firstRunSetupStatus !== "idle",
    );
    if (!shouldWarmRuntime) return;

    const task = InteractionManager.runAfterInteractions(() => {
      void preloadRuntime().catch(() => {
        // The active wallet operation owns user-visible retry messaging.
      });
    });
    return () => task.cancel();
  }, [
    firstRunSetupStatus,
    preloadRuntime,
    state.isHydrated,
    state.pendingActivationUrl,
    state.pendingCheckoutVerification,
    state.pendingVerificationPublicServicePointId,
    state.session.walletId,
  ]);

  const continueFirstRunSetup = useCallback(async (): Promise<ActionResult> => {
    if (firstRunSetupPromiseRef.current) {
      return firstRunSetupPromiseRef.current;
    }

    const task = (async (): Promise<ActionResult> => {
      setFirstRunSetupError(undefined);
      const current = stateRef.current;

      try {
        if (current.session.walletId) {
          setFirstRunSetupStatus("creating");
          await ensureWalletReady(current.session.walletId);
          setFirstRunSetupStatus("ready");
          return { ok: true };
        }

        const draft = firstRunSetupDraftRef.current;
        if (!draft) {
          const error = "Return to PIN setup to restart secure wallet creation.";
          setFirstRunSetupError(error);
          setFirstRunSetupStatus("error");
          return { ok: false, error };
        }

        setFirstRunSetupStatus("creating");
        if (!draft.walletId) {
          const result = await createHolderWallet();
          draft.walletId = result.walletId;
        }

        const latest = stateRef.current;
        await persistState({
          biometricEnabled: latest.biometricEnabled,
          changePinAttempts: latest.changePinAttempts,
          failedAttempts: 0,
          onboardingCompleted: false,
          pinHash: draft.pinHash,
          pinSalt: draft.pinSalt,
          pendingActivationUrl: latest.pendingActivationUrl,
          pendingCheckoutVerification: latest.pendingCheckoutVerification,
          pendingVerificationPublicServicePointId: latest.pendingVerificationPublicServicePointId,
          session: {
            authStatus: "signedIn",
            lockStatus: "unlocked",
            pendingOfferIds: latest.session.pendingOfferIds,
            walletId: draft.walletId,
          },
        });

        setFirstRunSetupStatus("ready");
        return { ok: true };
      } catch (error) {
        const result = actionErrorFromUnknown(error, "Wallet could not be created.");
        setFirstRunSetupError(result.error);
        setFirstRunSetupStatus("error");
        return result;
      } finally {
        firstRunSetupPromiseRef.current = null;
      }
    })();

    firstRunSetupPromiseRef.current = task;
    return task;
  }, [createHolderWallet, ensureWalletReady, persistState]);

  const startFirstRunSetup = useCallback((pin: string, confirmation: string): ActionResult => {
    const validation = validatePinConfirmation(pin, confirmation);
    if (!validation.ok) return validation;

    setFirstRunSetupError(undefined);
    setFirstRunSetupStatus("preparing");

    const pinSalt = createPinSalt();
    void hashPin(pin, pinSalt)
      .then((pinHash) => {
        firstRunSetupDraftRef.current = { pinHash, pinSalt };
        return continueFirstRunSetup();
      })
      .catch((error: unknown) => {
        const result = actionErrorFromUnknown(error, "PIN protection could not be prepared.");
        setFirstRunSetupError(result.error);
        setFirstRunSetupStatus("error");
      });

    return { ok: true };
  }, [continueFirstRunSetup]);

  const retryFirstRunSetup = useCallback(async (): Promise<ActionResult> => {
    setFirstRunSetupError(undefined);
    return continueFirstRunSetup();
  }, [continueFirstRunSetup]);

  const resetFirstRunSetup = useCallback(async () => {
    firstRunSetupDraftRef.current = null;
    firstRunSetupPromiseRef.current = null;
    setFirstRunSetupError(undefined);
    setFirstRunSetupStatus("idle");
    if (!stateRef.current.session.walletId) {
      await resetAgent();
    }
  }, [resetAgent]);

  const setPendingActivationUrl = useCallback(async (url?: string) => {
    const current = stateRef.current;
    await persistState({ ...persistedStateFromProvider(current), pendingActivationUrl: url });
  }, [persistState]);

  const setPendingCheckoutVerification = useCallback(async (request?: PendingCheckoutVerification) => {
    const current = stateRef.current;
    const nextState: PersistedWalletSessionState = {
      biometricEnabled: current.biometricEnabled,
      changePinAttempts: current.changePinAttempts,
      failedAttempts: current.failedAttempts,
      onboardingCompleted: current.onboardingCompleted,
      pinHash: current.pinHash,
      pinSalt: current.pinSalt,
      pendingActivationUrl: current.pendingActivationUrl,
      pendingCheckoutVerification: request,
      pendingVerificationPublicServicePointId: current.pendingVerificationPublicServicePointId,
      session: current.session,
    };
    stateRef.current = { ...current, ...nextState };
    setState((value) => ({ ...value, ...nextState }));
    await saveWalletSessionState(nextState);
  }, []);

  useEffect(() => {
    if (!state.isHydrated) return;

    const stashVerificationLink = (url: string | null) => {
      if (!url) return;
      const checkout = parseCheckoutVerificationLink(url);
      if (checkout.ok) {
        void setPendingCheckoutVerification({
          verificationRequestId: checkout.verificationRequestId,
          claimToken: checkout.claimToken,
        });
        return;
      }
      const parsed = parseVerificationLink(url);
      if (parsed.ok) void setPendingVerificationPublicServicePointId(parsed.publicServicePointId);
    };

    void Linking.getInitialURL().then(stashVerificationLink);
    const subscription = Linking.addEventListener("url", ({ url }) => stashVerificationLink(url));
    return () => subscription.remove();
  }, [setPendingCheckoutVerification, setPendingVerificationPublicServicePointId, state.isHydrated]);

  const addPendingOfferId = useCallback(async (credentialRecordId: string) => {
    const current = stateRef.current;

    if (current.session.pendingOfferIds.includes(credentialRecordId)) {
      return;
    }

    const next: PersistedWalletSessionState = {
      biometricEnabled: current.biometricEnabled,
      changePinAttempts: current.changePinAttempts,
      failedAttempts: current.failedAttempts,
      onboardingCompleted: current.onboardingCompleted,
      pinHash: current.pinHash,
      pinSalt: current.pinSalt,
      pendingActivationUrl: current.pendingActivationUrl,
      pendingCheckoutVerification: current.pendingCheckoutVerification,
      pendingVerificationPublicServicePointId: current.pendingVerificationPublicServicePointId,
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
      onboardingCompleted: current.onboardingCompleted,
      pinHash: current.pinHash,
      pinSalt: current.pinSalt,
      pendingActivationUrl: current.pendingActivationUrl,
      pendingCheckoutVerification: current.pendingCheckoutVerification,
      pendingVerificationPublicServicePointId: current.pendingVerificationPublicServicePointId,
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

    let active = true;
    let unsubscribe: (() => void) | undefined;

    void loadHolderAgentRuntime()
      .then((runtime) => {
        if (!active) return;
        unsubscribe = runtime.subscribeToOfferReceived((record) => {
          if (isPendingCredentialOffer(record)) {
            void addPendingOfferId(record.id);
            return;
          }

          if (isStoredCredential(record)) {
            void removePendingOfferId(record.id);
          }
        });
      })
      .catch((error) => {
        console.error("[holder-agent] Unable to subscribe to credential offers.", error);
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [addPendingOfferId, removePendingOfferId, state.session.lockStatus, state.session.walletId]);

  /**
   * Processes an activation link once, even if React sends the same URL through twice.
   *
   * @param url - The wallet activation URL from an email link, app link, or QR scan.
   * @returns The next place the app should send the student after handling the link.
   */
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

        if (!current.session.walletId || !current.onboardingCompleted) {
          // Links opened before first-run setup completes stay in encrypted
          // session storage so process death cannot lose the activation.
          await setPendingActivationUrl(url);
          return { ok: true, activationTarget: "stashed" };
        }

        const resolved = await resolveWalletActivation(parsed.data);

        if (!resolved.ok) {
          return resolved;
        }

        try {
          const runtime = await loadHolderAgentRuntime();
          const credentialRecord = await runtime.receiveCredentialOffer(resolved.data.invitationUrl);

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
    [addPendingOfferId, removePendingOfferId, setPendingActivationUrl],
  );

  const completeOnboarding = useCallback(async () => {
    const current = stateRef.current;
    if (current.onboardingCompleted) return;
    await persistState({ ...persistedStateFromProvider(current), onboardingCompleted: true });
  }, [persistState]);

  const clearPendingFlow = useCallback(
    async (kind: Exclude<PendingFlowKind, "home">) => {
      if (kind === "checkout") {
        await setPendingCheckoutVerification(undefined);
        return;
      }
      if (kind === "servicePoint") {
        await setPendingVerificationPublicServicePointId(undefined);
        return;
      }
      if (kind === "activation") {
        await setPendingActivationUrl(undefined);
      }
      // Credential offers are wallet records and must never be destroyed by
      // dismissing the resume screen. Students can review them later from Home.
    },
    [setPendingActivationUrl, setPendingCheckoutVerification, setPendingVerificationPublicServicePointId],
  );

  const continuePendingFlow = useCallback(async (): Promise<PendingFlowContinuation> => {
    const current = stateRef.current;

    // Resume the most time-sensitive capability first, then service-point proof,
    // activation, and finally durable credential offers.
    if (current.pendingCheckoutVerification) {
      const { verificationRequestId, claimToken } = current.pendingCheckoutVerification;
      return {
        ok: true,
        kind: "checkout",
        href: `/verify/checkout/${encodeURIComponent(verificationRequestId)}?token=${encodeURIComponent(claimToken)}`,
      };
    }

    if (current.pendingVerificationPublicServicePointId) {
      return {
        ok: true,
        kind: "servicePoint",
        href: `/verify/${encodeURIComponent(current.pendingVerificationPublicServicePointId)}`,
      };
    }

    if (current.pendingActivationUrl) {
      const result = await processIncomingLink(current.pendingActivationUrl);
      if (!result.ok) return { ok: false, kind: "activation", error: result.error };

      await setPendingActivationUrl(undefined);
      return {
        ok: true,
        kind: "activation",
        href: result.activationTarget === "offers" ? "/(wallet)/offers" : "/(wallet)/credential",
      };
    }

    if (current.session.pendingOfferIds.length > 0) {
      return { ok: true, kind: "offer", href: "/(wallet)/offers" };
    }

    return { ok: true, kind: "home", href: "/(wallet)/home" };
  }, [processIncomingLink, setPendingActivationUrl]);

  const createWallet = useCallback(
    async (pin: string, confirmation: string): Promise<ActionResult> => {
      const validation = validatePinConfirmation(pin, confirmation);

      if (!validation.ok) {
        return validation;
      }

      const pinSalt = createPinSalt();
      const pinHash = await hashPin(pin, pinSalt);
      const current = stateRef.current;
      const isRestoredPinSetup = Boolean(current.session.walletId && !hasStoredPin(current));

      let walletId: string;
      try {
        // A restored store already exists. This setup pass only creates a fresh
        // device PIN instead of replacing the imported wallet.
        if (current.session.walletId && !hasStoredPin(current)) {
          walletId = current.session.walletId;
        } else {
          const result = await createHolderWallet();
          walletId = result.walletId;
        }
      } catch (error) {
        return actionErrorFromUnknown(error, "Wallet could not be created.");
      }

      const nextState: PersistedWalletSessionState = {
        biometricEnabled: current.biometricEnabled,
        changePinAttempts: current.changePinAttempts,
        failedAttempts: 0,
        onboardingCompleted: isRestoredPinSetup,
        pinHash,
        pinSalt,
        pendingActivationUrl: current.pendingActivationUrl,
        pendingCheckoutVerification: current.pendingCheckoutVerification,
        pendingVerificationPublicServicePointId: current.pendingVerificationPublicServicePointId,
        session: {
          authStatus: "signedIn",
          lockStatus: "unlocked",
          pendingOfferIds: current.session.pendingOfferIds,
          walletId,
        },
      };

      await persistState(nextState);
      void linkPaymentWalletBestEffort();

      return { ok: true };
    },
    [createHolderWallet, persistState],
  );

  const restoreWallet = useCallback(
    async (path: string, recoveryPassword: string): Promise<ActionResult> => {
      const current = stateRef.current;

      if (current.session.walletId) {
        return { ok: false, error: "Sign out before restoring a different wallet." };
      }

      try {
        const { walletId } = await restoreHolderWallet(path, recoveryPassword);
        await persistState({
          biometricEnabled: false,
          changePinAttempts: 0,
          failedAttempts: 0,
          onboardingCompleted: true,
          pendingActivationUrl: current.pendingActivationUrl,
          pendingCheckoutVerification: current.pendingCheckoutVerification,
          pendingVerificationPublicServicePointId: current.pendingVerificationPublicServicePointId,
          session: {
            authStatus: "signedIn",
            lockStatus: "unlocked",
            pendingOfferIds: [],
            walletId,
          },
        });
        return { ok: true };
      } catch (error) {
        console.error("[wallet-restore] failed", error);
        return actionErrorFromUnknown(
          error,
          "The backup could not be opened. Check the file and recovery password, then try again.",
        );
      }
    },
    [persistState, restoreHolderWallet],
  );

  const acceptOffer = useCallback(
    async (credentialRecordId: string): Promise<ActionResult> => {
      try {
        const runtime = await loadHolderAgentRuntime();
        await runtime.acceptCredentialOffer(credentialRecordId);
        await removePendingOfferId(credentialRecordId);
        void linkPaymentWalletForCredential(credentialRecordId);
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
        const runtime = await loadHolderAgentRuntime();
        await runtime.declineCredentialOffer(credentialRecordId);
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

      await persistState({
        biometricEnabled: state.biometricEnabled,
        changePinAttempts: state.changePinAttempts,
        failedAttempts: 0,
        pinHash: state.pinHash,
        pinSalt: state.pinSalt,
        session: { ...state.session, lockStatus: "unlocked" },
      });

      if (state.session.walletId) {
        void ensureWalletReady(state.session.walletId).catch(() => {
          // HolderAgentProvider exposes the failure inline without extending PIN confirmation.
        });
      }

      return { ok: true };
    },
    [ensureWalletReady, persistState, state],
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

    if (state.session.walletId) {
      void ensureWalletReady(state.session.walletId).catch(() => {
        // HolderAgentProvider exposes the failure inline without extending biometric confirmation.
      });
    }

    return { ok: true };
  }, [ensureWalletReady, persistState, state]);

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
    await clearVerificationActivity();
    await resetAgent();
    firstRunSetupDraftRef.current = null;
    firstRunSetupPromiseRef.current = null;
    setFirstRunSetupError(undefined);
    setFirstRunSetupStatus("idle");
    setState((current) => ({
      ...current,
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      onboardingCompleted: true,
      pinHash: undefined,
      pinSalt: undefined,
      pendingActivationUrl: undefined,
      pendingCheckoutVerification: undefined,
      pendingVerificationPublicServicePointId: undefined,
      session: signedOutSession,
    }));
  }, [resetAgent]);

  const value = useMemo<WalletSessionContextValue>(
    () => ({
      acceptOffer,
      biometricAvailable: state.biometricAvailable,
      biometricEnabled: state.biometricEnabled,
      changePin,
      clearPendingFlow,
      completeOnboarding,
      confirmPinToDisableBiometric,
      continuePendingFlow,
      createWallet,
      declineOffer,
      failedAttempts: state.failedAttempts,
      firstRunSetupError: firstRunSetupError ?? holderAgentError,
      firstRunSetupStatus,
      hasPin: hasStoredPin(state),
      isHardLocked: isSessionHardLocked(state.failedAttempts),
      isHydrated: state.isHydrated,
      lockWallet,
      onboardingCompleted: state.onboardingCompleted,
      pendingActivationUrl: state.pendingActivationUrl,
      pendingOfferIds: state.session.pendingOfferIds,
      pendingCheckoutVerification: state.pendingCheckoutVerification,
      pendingVerificationPublicServicePointId: state.pendingVerificationPublicServicePointId,
      processIncomingLink,
      resetFirstRunSetup,
      restoreWallet,
      retryFirstRunSetup,
      session: state.session,
      setBiometricEnabled,
      setPendingCheckoutVerification,
      setPendingVerificationPublicServicePointId,
      signOut,
      startFirstRunSetup,
      unlockWithBiometric,
      unlockWithPin,
    }),
    [
      acceptOffer,
      changePin,
      clearPendingFlow,
      completeOnboarding,
      confirmPinToDisableBiometric,
      continuePendingFlow,
      createWallet,
      declineOffer,
      firstRunSetupError,
      firstRunSetupStatus,
      holderAgentError,
      lockWallet,
      processIncomingLink,
      resetFirstRunSetup,
      restoreWallet,
      retryFirstRunSetup,
      setBiometricEnabled,
      setPendingCheckoutVerification,
      setPendingVerificationPublicServicePointId,
      signOut,
      startFirstRunSetup,
      state,
      unlockWithBiometric,
      unlockWithPin,
    ],
  );

  return <WalletSessionContext.Provider value={value}>{children}</WalletSessionContext.Provider>;
}

/** Redirects routes that do not match the current setup, lock, or pending-flow state. */
export function WalletRouteGate({ children }: PropsWithChildren) {
  const {
    hasPin,
    firstRunSetupStatus,
    isHydrated,
    onboardingCompleted,
    pendingActivationUrl,
    pendingCheckoutVerification,
    pendingOfferIds,
    pendingVerificationPublicServicePointId,
    session,
  } = useWalletSession();
  const segments = useSegments();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const routeAccess = getWalletRouteAccess(session, hasPin, onboardingCompleted, firstRunSetupStatus);
    const onOnboardingRoute = segments.includes("onboarding");
    const onResumeRoute = segments.includes("resume");
    const onWalletRoute = segments.includes("(wallet)");
    const onVerificationRoute = segments.includes("verify");
    const hasPendingFlow = Boolean(
      pendingCheckoutVerification ||
      pendingVerificationPublicServicePointId ||
      pendingActivationUrl ||
      pendingOfferIds.length > 0,
    );

    if (
      routeAccess === "wallet" &&
      hasPendingFlow &&
      !onWalletRoute &&
      !onVerificationRoute &&
      !segments.includes("activate") &&
      !onOnboardingRoute &&
      !onResumeRoute
    ) {
      router.replace("/(auth)/resume");
      return;
    }

    if (
      routeAccess === "wallet" &&
      pendingCheckoutVerification &&
      !onVerificationRoute &&
      !onOnboardingRoute &&
      !onResumeRoute
    ) {
      router.replace({
        pathname: "/verify/checkout/[verificationRequestId]",
        params: {
          verificationRequestId: pendingCheckoutVerification.verificationRequestId,
          token: pendingCheckoutVerification.claimToken,
        },
      });
      return;
    }

    if (
      routeAccess === "wallet" &&
      pendingVerificationPublicServicePointId &&
      !onVerificationRoute &&
      !onOnboardingRoute &&
      !onResumeRoute
    ) {
      router.replace(`/verify/${encodeURIComponent(pendingVerificationPublicServicePointId)}`);
      return;
    }

    if (!isRouteAllowedForAccess(segments, routeAccess)) {
      router.replace(getWalletRouteHref(routeAccess));
    }
  }, [firstRunSetupStatus, hasPin, isHydrated, onboardingCompleted, pendingActivationUrl, pendingCheckoutVerification, pendingOfferIds.length, pendingVerificationPublicServicePointId, segments, session]);

  if (!isHydrated) {
    return <OperationStateScreen busy tone="secure" eyebrow="UNIFY wallet" title="Checking secure storage" message="Reading the encrypted wallet state on this device." />;
  }

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
