import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useRef, useState } from "react";

import type { HolderAgent } from "./holderAgent";
import { loadedHolderAgentRuntime, loadHolderAgentRuntime } from "./holderAgentRuntime";

type HolderAgentStatus = "idle" | "initializing" | "ready" | "error";

type HolderAgentState = {
  agent: HolderAgent | null;
  error?: string;
  status: HolderAgentStatus;
  walletId?: string;
};

type HolderAgentContextValue = HolderAgentState & {
  createWallet: () => Promise<{ walletId: string }>;
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

export function HolderAgentProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<HolderAgentState>({ agent: null, status: "idle" });
  const initPromiseRef = useRef<Promise<HolderAgent | null> | null>(null);
  const agentRef = useRef<HolderAgent | null>(null);
  const walletIdRef = useRef<string | undefined>(undefined);

  const resetAgent = useCallback(async () => {
    const activeAgent = agentRef.current;
    initPromiseRef.current = null;
    agentRef.current = null;
    walletIdRef.current = undefined;
    const runtimePromise = loadedHolderAgentRuntime();
    if (runtimePromise) {
      const runtime = await runtimePromise;
      runtime.clearActiveHolderAgent();
    }
    setState({ agent: null, status: "idle" });

    if (activeAgent?.shutdown) {
      await activeAgent.shutdown();
    }
  }, []);

  const createWallet = useCallback<HolderAgentContextValue["createWallet"]>(async () => {
    setState({ agent: null, status: "initializing" });

    try {
      const runtime = await loadHolderAgentRuntime();
      const { walletId, agent } = await runtime.createLocalHolderWallet();
      agentRef.current = agent;
      walletIdRef.current = walletId;
      setState({ agent, status: "ready", walletId });
      return { walletId };
    } catch (error) {
      const message = errorMessageFromUnknown(error);
      agentRef.current = null;
      walletIdRef.current = undefined;
      setState({ agent: null, error: message, status: "error" });
      throw error;
    }
  }, []);

  const resumeWallet = useCallback<HolderAgentContextValue["resumeWallet"]>(async (walletId) => {
    if (agentRef.current && walletIdRef.current === walletId) {
      return agentRef.current;
    }

    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }

    setState({ agent: agentRef.current, status: "initializing", walletId });

    initPromiseRef.current = loadHolderAgentRuntime()
      .then((runtime) => runtime.resumeHolderAgentSession(walletId))
      .then((agent) => {
        agentRef.current = agent;
        walletIdRef.current = walletId;
        setState({ agent, status: "ready", walletId });
        initPromiseRef.current = null;
        return agent;
      })
      .catch((error: unknown) => {
        const message = errorMessageFromUnknown(error);
        initPromiseRef.current = null;
        agentRef.current = null;
        walletIdRef.current = undefined;
        setState({ agent: null, error: message, status: "error" });
        throw error;
      });

    return initPromiseRef.current;
  }, []);

  const restoreWallet = useCallback<HolderAgentContextValue["restoreWallet"]>(async (path, recoveryPassword) => {
    setState({ agent: null, status: "initializing" });

    try {
      const runtime = await loadHolderAgentRuntime();
      const { walletId, agent } = await runtime.restoreEncryptedHolderWallet(path, recoveryPassword);
      agentRef.current = agent;
      walletIdRef.current = walletId;
      setState({ agent, status: "ready", walletId });
      return { walletId };
    } catch (error) {
      const message = errorMessageFromUnknown(error);
      agentRef.current = null;
      walletIdRef.current = undefined;
      setState({ agent: null, error: message, status: "error" });
      throw error;
    }
  }, []);

  const value = useMemo<HolderAgentContextValue>(
    () => ({
      ...state,
      createWallet,
      restoreWallet,
      resumeWallet,
      resetAgent,
    }),
    [createWallet, resetAgent, restoreWallet, resumeWallet, state],
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
