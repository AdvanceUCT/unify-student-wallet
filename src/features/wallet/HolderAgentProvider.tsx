/**
 * @fileoverview Exposes the initialized holder agent and its startup failure state to React screens.
 * @module features/wallet/HolderAgentProvider
 */

import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useRef, useState } from "react";

import type { HolderAgent } from "./holderAgent";
import { loadedHolderAgentRuntime, loadHolderAgentRuntime } from "./holderAgentRuntime";

type HolderAgentStatus = "idle" | "initializing" | "ready" | "error";
type HolderRuntimeStatus = "idle" | "loading" | "ready" | "error";

type HolderAgentState = {
  agent: HolderAgent | null;
  generation?: number;
  error?: string;
  status: HolderAgentStatus;
  walletId?: string;
};

type HolderAgentContextValue = HolderAgentState & {
  runtimeStatus: HolderRuntimeStatus;
  createWallet: () => Promise<{ walletId: string }>;
  ensureWalletReady: (walletId: string) => Promise<HolderAgent | null>;
  preloadRuntime: () => Promise<void>;
  restoreWallet: (path: string, recoveryPassword: string) => Promise<{ walletId: string }>;
  resumeWallet: (walletId: string) => Promise<HolderAgent | null>;
  resetAgent: () => Promise<void>;
};

const HolderAgentContext = createContext<HolderAgentContextValue | null>(null);

function errorMessageFromUnknown(error: unknown) {
  if (!(error instanceof Error)) {
    return "Credo holder agent could not be initialized.";
  }

  const messages = [error.message];
  let cause = error.cause;

  while (cause instanceof Error && messages.length < 4) {
    messages.push(cause.message);
    cause = cause.cause;
  }

  return messages.join(" Caused by: ");
}

/**
 * Own the native agent for the selected wallet and publish its readiness to screens.
 * A generation is an in-memory version number: results from an older version cannot make a replacement wallet ready.
 */
export function HolderAgentProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<HolderAgentState>({ agent: null, status: "idle" });
  const [runtimeStatus, setRuntimeStatus] = useState<HolderRuntimeStatus>("idle");
  const lifecycle = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pendingResume = useRef<{ walletId: string; generation: number; promise: Promise<HolderAgent | null> } | null>(null);
  /**
   * Run create, restore, resume and shutdown work in order because they share native wallet resources.
   * Recover the queue after an error while returning that error to the operation's caller.
   */
  const serialize = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.current.then(operation, operation);
    queue.current = result.catch(() => undefined);
    return result;
  }, []);
  const agentRef = useRef<HolderAgent | null>(null);
  const walletIdRef = useRef<string | undefined>(undefined);

  /**
   * Load native wallet modules only when needed and expose loading or failure to the UI.
   */
  const preloadRuntime = useCallback(async () => {
    const existingRuntime = loadedHolderAgentRuntime();
    if (!existingRuntime) setRuntimeStatus("loading");
    try {
      await (existingRuntime ?? loadHolderAgentRuntime());
      setRuntimeStatus("ready");
    } catch (error) {
      setRuntimeStatus("error");
      throw error;
    }
  }, []);

  /**
   * Forget the active agent before awaiting shutdown so new readers cannot reuse a closing wallet.
   */
  const closeAgent = useCallback(async () => {
    const active = agentRef.current;
    agentRef.current = null;
    walletIdRef.current = undefined;
    const runtime = loadedHolderAgentRuntime();
    if (runtime) (await runtime).clearActiveHolderAgent();
    if (active?.shutdown) await active.shutdown();
  }, []);

  /**
   * Invalidate outstanding startup results immediately, then close the old agent through the lifecycle queue.
   */
  const resetAgent = useCallback(async () => {
    const generation = ++lifecycle.current;
    pendingResume.current = null;
    setState({ agent: null, status: "idle", generation });
    await serialize(closeAgent);
  }, [closeAgent, serialize]);

  /**
   * Start a new lifecycle before queuing the native operation.
   * Close the previous agent first, and publish readiness only if this operation still owns the current generation.
   * If a superseded operation opens an agent, close it before the next queued operation uses native resources.
   */
  const activate = useCallback(async (
    operation: (runtime: Awaited<ReturnType<typeof loadHolderAgentRuntime>>) => Promise<{ walletId: string; agent: HolderAgent | null }>,
    walletId?: string,
  ) => {
    const generation = ++lifecycle.current;
    setState({ agent: null, status: "initializing", walletId, generation });
    return serialize(async () => {
      const assertCurrent = () => {
        if (generation !== lifecycle.current) throw new Error("Wallet opening was superseded by another wallet lifecycle.");
      };
      assertCurrent();
      try {
        await closeAgent();
        assertCurrent();
        await preloadRuntime();
        assertCurrent();
        const runtime = await loadHolderAgentRuntime();
        const result = await operation(runtime);
        // Keep ownership until a superseded native open has been closed. The next
        // queued open must never run against its still-open Askar store.
        agentRef.current = result.agent;
        walletIdRef.current = result.walletId;
        if (generation !== lifecycle.current) {
          await closeAgent();
          assertCurrent();
        }
        setState({ ...result, status: "ready", generation });
        return result;
      } catch (error) {
        if (generation === lifecycle.current) {
          setState({ agent: null, walletId, generation, status: "error", error: errorMessageFromUnknown(error) });
        }
        throw error;
      }
    });
  }, [closeAgent, preloadRuntime, serialize]);

  const createWallet = useCallback<HolderAgentContextValue["createWallet"]>(async () => {
    const result = await activate(runtime => runtime.createLocalHolderWallet());
    return { walletId: result.walletId };
  }, [activate]);

  const restoreWallet = useCallback<HolderAgentContextValue["restoreWallet"]>(async (path, password) => {
    const result = await activate(runtime => runtime.restoreEncryptedHolderWallet(path, password));
    return { walletId: result.walletId };
  }, [activate]);

  /**
   * Reuse an already-open wallet or its current startup promise instead of opening the same store twice.
   * Clear only this promise on completion so an older request cannot clear a newer startup.
   */
  const resumeWallet = useCallback<HolderAgentContextValue["resumeWallet"]>((walletId) => {
    const pending = pendingResume.current;
    if (pending?.walletId === walletId && pending.generation === lifecycle.current) return pending.promise;
    if (agentRef.current && walletIdRef.current === walletId && !pending) return Promise.resolve(agentRef.current);
    const promise = activate(async runtime => ({ walletId, agent: await runtime.resumeHolderAgentSession(walletId) }), walletId).then(result => result.agent);
    const entry = { walletId, generation: lifecycle.current, promise };
    pendingResume.current = entry;
    void promise.finally(() => { if (pendingResume.current === entry) pendingResume.current = null; }).catch(() => undefined);
    return promise;
  }, [activate]);

  const value = useMemo<HolderAgentContextValue>(
    () => ({
      ...state,
      runtimeStatus,
      createWallet,
      ensureWalletReady: resumeWallet,
      preloadRuntime,
      restoreWallet,
      resumeWallet,
      resetAgent,
    }),
    [createWallet, preloadRuntime, resetAgent, restoreWallet, resumeWallet, runtimeStatus, state],
  );

  return <HolderAgentContext.Provider value={value}>{children}</HolderAgentContext.Provider>;
}

export function useHolderAgent() {
  const value = useContext(HolderAgentContext);

  if (!value) {
    throw new Error("useHolderAgent must be used within HolderAgentProvider.");
  }

  return value;
}
