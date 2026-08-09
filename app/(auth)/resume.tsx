import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { OperationStateScreen } from "@/src/components/OperationStateScreen";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import type { PendingFlowKind } from "@/src/features/wallet/sessionTypes";

const COPY: Record<PendingFlowKind, { eyebrow: string; title: string; message: string }> = {
  checkout: {
    eyebrow: "Pending checkout",
    title: "Opening verification",
    message: "Returning to the checkout request you opened before setup.",
  },
  servicePoint: {
    eyebrow: "Pending verification",
    title: "Opening service point",
    message: "Returning to the in-person verification request.",
  },
  activation: {
    eyebrow: "Pending activation",
    title: "Receiving credential",
    message: "Connecting to your institution with the saved activation link.",
  },
  offer: {
    eyebrow: "Credential offer",
    title: "Opening secure offer",
    message: "Your institution's credential is ready for review.",
  },
  home: {
    eyebrow: "UNIFY wallet",
    title: "Opening your wallet",
    message: "Your secure wallet is ready.",
  },
};

export default function ResumePendingFlowScreen() {
  const {
    clearPendingFlow,
    continuePendingFlow,
    pendingActivationUrl,
    pendingCheckoutVerification,
    pendingOfferIds,
    pendingVerificationPublicServicePointId,
    session,
  } = useWalletSession();
  const holderAgent = useHolderAgent();
  const pendingKind: PendingFlowKind = pendingCheckoutVerification
    ? "checkout"
    : pendingVerificationPublicServicePointId
      ? "servicePoint"
      : pendingActivationUrl
        ? "activation"
        : pendingOfferIds.length > 0
          ? "offer"
          : "home";
  const [kind, setKind] = useState<PendingFlowKind>(pendingKind);
  const pendingKindRef = useRef(pendingKind);
  pendingKindRef.current = pendingKind;
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    setKind(pendingKindRef.current);

    if (pendingKindRef.current === "home") {
      router.replace("/(wallet)/home");
      return () => {
        active = false;
      };
    }

    if (holderAgent.status === "idle" || holderAgent.status === "initializing") {
      return () => {
        active = false;
      };
    }

    if (holderAgent.status === "error") {
      setError(holderAgent.error ?? "Secure wallet services could not be started.");
      return () => {
        active = false;
      };
    }

    void continuePendingFlow().then((result) => {
      if (!active) return;
      setKind(result.kind);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(result.href as never);
    });

    return () => {
      active = false;
    };
  }, [continuePendingFlow, holderAgent.error, holderAgent.status, retryToken]);

  function handleRetry() {
    if (holderAgent.status === "error" && session.walletId) {
      void holderAgent.resumeWallet(session.walletId);
      return;
    }
    setRetryToken((value) => value + 1);
  }

  async function handleContinue() {
    if (kind !== "home") await clearPendingFlow(kind);
    router.replace("/(wallet)/home");
  }

  const copy = COPY[kind];

  if (error) {
    return (
      <OperationStateScreen
        tone="warning"
        eyebrow="Resume interrupted"
        title="Could not resume this request"
        message={error}
        primaryAction={{ label: "Try again", onPress: handleRetry }}
        secondaryAction={{ label: "Continue to wallet", onPress: () => void handleContinue() }}
      />
    );
  }

  return <OperationStateScreen busy tone="secure" eyebrow={copy.eyebrow} title={copy.title} message={copy.message} />;
}
