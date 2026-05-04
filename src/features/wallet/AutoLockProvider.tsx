import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, View } from "react-native";

import { useWalletSession } from "./WalletSessionProvider";
import { BACKGROUND_LOCK_MS, INACTIVITY_LOCK_MS } from "./lockConfig";

type AutoLockContextValue = {
  /**
   * Suspend auto-lock for an activity identified by `key`. Multiple callers may
   * hold independent suspensions — the lock resumes only when all keys are released.
   */
  suspendAutoLock: (key: string) => void;
  /** Release a previously acquired suspension key. */
  resumeAutoLock: (key: string) => void;
};

const AutoLockContext = createContext<AutoLockContextValue | null>(null);

export function AutoLockProvider({ children }: PropsWithChildren) {
  const { lockWallet, session } = useWalletSession();
  const isUnlocked = session.lockStatus === "unlocked";

  const [suspendKeys, setSuspendKeys] = useState<ReadonlySet<string>>(() => new Set());
  const isSuspended = suspendKeys.size > 0;

  // Refs keep callbacks inside timers and AppState handlers free from stale closures.
  const isUnlockedRef = useRef(isUnlocked);
  const isSuspendedRef = useRef(isSuspended);
  const lockWalletRef = useRef(lockWallet);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    isUnlockedRef.current = isUnlocked;
  }, [isUnlocked]);

  useEffect(() => {
    isSuspendedRef.current = isSuspended;
  }, [isSuspended]);

  useEffect(() => {
    lockWalletRef.current = lockWallet;
  }, [lockWallet]);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current !== null) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();

    if (!isUnlockedRef.current || isSuspendedRef.current) {
      return;
    }

    inactivityTimerRef.current = setTimeout(() => {
      void lockWalletRef.current();
    }, INACTIVITY_LOCK_MS);
  }, [clearInactivityTimer]);

  // Start or stop the inactivity timer whenever unlock/suspension state changes.
  useEffect(() => {
    if (isUnlocked && !isSuspended) {
      startInactivityTimer();
    } else {
      clearInactivityTimer();
    }

    return clearInactivityTimer;
  }, [clearInactivityTimer, isSuspended, isUnlocked, startInactivityTimer]);

  // Handle app backgrounding: record timestamp on hide, check elapsed on return.
  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === "background" || nextState === "inactive") {
        backgroundTimestampRef.current = Date.now();
        clearInactivityTimer();
        return;
      }

      if (nextState === "active") {
        const backgroundedAt = backgroundTimestampRef.current;
        backgroundTimestampRef.current = null;

        if (backgroundedAt !== null && isUnlockedRef.current) {
          const elapsed = Date.now() - backgroundedAt;

          if (elapsed >= BACKGROUND_LOCK_MS) {
            void lockWalletRef.current();
            return;
          }
        }

        if (isUnlockedRef.current && !isSuspendedRef.current) {
          startInactivityTimer();
        }
      }
    }

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [clearInactivityTimer, startInactivityTimer]);

  const suspendAutoLock = useCallback((key: string) => {
    setSuspendKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const resumeAutoLock = useCallback((key: string) => {
    setSuspendKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  // Called on every touch start/move. Resets the inactivity countdown.
  function handleUserActivity() {
    if (isUnlockedRef.current && !isSuspendedRef.current) {
      startInactivityTimer();
    }
  }

  return (
    <AutoLockContext.Provider value={{ resumeAutoLock, suspendAutoLock }}>
      <View
        onMoveShouldSetResponder={() => {
          handleUserActivity();
          return false;
        }}
        onStartShouldSetResponder={() => {
          handleUserActivity();
          return false;
        }}
        style={{ flex: 1 }}
      >
        {children}
      </View>
    </AutoLockContext.Provider>
  );
}

/**
 * Access the auto-lock suspension API. Must be called inside a component
 * rendered within `AutoLockProvider`.
 */
export function useAutoLock(): AutoLockContextValue {
  const value = useContext(AutoLockContext);

  if (!value) {
    throw new Error("useAutoLock must be used within AutoLockProvider.");
  }

  return value;
}
