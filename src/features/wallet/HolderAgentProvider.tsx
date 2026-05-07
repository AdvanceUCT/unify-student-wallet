import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useRef, useState } from "react";

import type { ResolvedWalletActivation } from "./activationResolver";
import {
  acceptCredentialInvitation,
  initializeHolderAgent,
  type HolderActivationResult,
  type HolderAgent,
} from "./holderAgent";

type HolderAgentStatus = "idle" | "initializing" | "ready" | "error";

type HolderAgentState = {
  agent: HolderAgent | null;
  error?: string;
  status: HolderAgentStatus;
  walletId?: string;
};

type HolderAgentContextValue = HolderAgentState & {
  acceptInvitation: (activation: ResolvedWalletActivation) => Promise<HolderActivationResult>;
  ensureInitialized: (activation: Pick<ResolvedWalletActivation, "mediatorInvitationUrl" | "walletId">) => Promise<HolderAgent | null>;
  resetAgent: () => void;
};

const HolderAgentContext = createContext<HolderAgentContextValue | null>(null);

function errorMessageFromUnknown(error: unknown) {
  return error instanceof Error ? error.message : "Credo holder agent could not be initialized.";
}

export function HolderAgentProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<HolderAgentState>({ agent: null, status: "idle" });
  const initPromiseRef = useRef<Promise<HolderAgent | null> | null>(null);
  const agentRef = useRef<HolderAgent | null>(null);
  const walletIdRef = useRef<string | undefined>(undefined);

  const resetAgent = useCallback(() => {
    initPromiseRef.current = null;
    agentRef.current = null;
    walletIdRef.current = undefined;
    setState({ agent: null, status: "idle" });
  }, []);

  const ensureInitialized = useCallback<HolderAgentContextValue["ensureInitialized"]>(async (activation) => {
    if (agentRef.current && walletIdRef.current === activation.walletId) {
      return agentRef.current;
    }

    if (walletIdRef.current && walletIdRef.current !== activation.walletId) {
      resetAgent();
    }

    if (!initPromiseRef.current) {
      walletIdRef.current = activation.walletId;
      setState({
        agent: agentRef.current,
        status: "initializing",
        walletId: activation.walletId,
      });

      initPromiseRef.current = initializeHolderAgent({
        mediatorInvitationUrl: activation.mediatorInvitationUrl,
        walletId: activation.walletId,
      })
        .then((agent) => {
          agentRef.current = agent;
          setState({
            agent,
            status: "ready",
            walletId: activation.walletId,
          });
          return agent;
        })
        .catch((error: unknown) => {
          const message = errorMessageFromUnknown(error);
          initPromiseRef.current = null;
          agentRef.current = null;
          walletIdRef.current = undefined;
          setState({
            agent: null,
            error: message,
            status: "error",
          });
          throw error;
        });
    }

    return initPromiseRef.current;
  }, [resetAgent]);

  const acceptInvitation = useCallback<HolderAgentContextValue["acceptInvitation"]>(
    async (activation) => {
      const agent = await ensureInitialized(activation);
      return acceptCredentialInvitation(agent, activation);
    },
    [ensureInitialized],
  );

  const value = useMemo<HolderAgentContextValue>(
    () => ({
      ...state,
      acceptInvitation,
      ensureInitialized,
      resetAgent,
    }),
    [acceptInvitation, ensureInitialized, resetAgent, state],
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
