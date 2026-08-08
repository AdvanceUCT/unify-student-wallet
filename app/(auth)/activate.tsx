import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { OperationStateScreen } from "@/src/components/OperationStateScreen";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";

type Stage = "idle" | "resolving" | "awaitingOffer" | "redirecting" | "error";

const AWAIT_OFFER_TIMEOUT_MS = 30_000;

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function activationUrlFromParams(params: { oob?: string | string[]; token?: string | string[] }) {
  const token = firstParam(params.token)?.trim();
  const oob = firstParam(params.oob)?.trim();

  if (!token && !oob) {
    return null;
  }

  const queryParams: string[] = [];

  if (token) {
    queryParams.push(`token=${encodeURIComponent(token)}`);
  }

  if (oob) {
    queryParams.push(`oob=${encodeURIComponent(oob)}`);
  }

  return `unifywallet://activate?${queryParams.join("&")}`;
}

export default function ActivateScreen() {
  const { isHydrated, onboardingCompleted, pendingOfferIds, processIncomingLink, session } = useWalletSession();
  const params = useLocalSearchParams<{ oob?: string | string[]; token?: string | string[] }>();
  const routeActivationUrl = useMemo(() => activationUrlFromParams(params), [params]);
  const processedActivationUrlRef = useRef<string | null>(null);
  const baselineOfferCountRef = useRef<number>(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    // Expo can deliver the same link twice, so only process each activation URL once.
    if (!isHydrated || !routeActivationUrl || processedActivationUrlRef.current === routeActivationUrl) {
      return;
    }

    processedActivationUrlRef.current = routeActivationUrl;
    baselineOfferCountRef.current = pendingOfferIds.length;
    setStage("resolving");
    setError(null);

    void (async () => {
      const result = await processIncomingLink(routeActivationUrl);
      if (!result.ok) {
        setError(result.error);
        setStage("error");
        return;
      }

      if (result.activationTarget === "credential") {
        setStage("redirecting");
        router.replace("/(wallet)/credential");
        return;
      }

      if (result.activationTarget === "offers") {
        setStage("redirecting");
        router.replace("/(wallet)/offers");
        return;
      }

      if (result.activationTarget === "stashed") {
        setStage("redirecting");
        router.replace(session.walletId && !onboardingCompleted ? "/(auth)/onboarding" : "/(auth)/set-pin");
        return;
      }

      setStage("awaitingOffer");
    })();
  }, [isHydrated, onboardingCompleted, pendingOfferIds.length, processIncomingLink, retryToken, routeActivationUrl, session.walletId]);

  useEffect(() => {
    if (stage !== "awaitingOffer") {
      return;
    }

    // The connection can finish before the credential offer reaches the wallet.
    if (pendingOfferIds.length > baselineOfferCountRef.current) {
      setStage("redirecting");
      router.replace("/(wallet)/offers");
    }
  }, [pendingOfferIds.length, stage]);

  useEffect(() => {
    if (stage !== "awaitingOffer") {
      return;
    }

    // If Credo stays quiet, let the student retry the same activation link.
    const timeoutId = setTimeout(() => {
      setError("The credential offer did not arrive. Try opening the activation link again.");
      setStage("error");
    }, AWAIT_OFFER_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [stage]);

  function handleRetry() {
    processedActivationUrlRef.current = null;
    setError(null);
    setStage("idle");
    setRetryToken((value) => value + 1);
  }

  if (!routeActivationUrl) return <OperationStateScreen tone="warning" eyebrow="Credential activation" title="Activation link missing" message="Open the secure activation link sent by your institution to receive a credential." primaryAction={{ label: "Back", onPress: () => router.back() }} />;
  if (stage === "error" && error) return <OperationStateScreen tone="warning" eyebrow="Credential activation" title="Credential could not be received" message={error} primaryAction={{ label: "Try again", onPress: handleRetry }} secondaryAction={{ label: "Cancel", onPress: () => router.back() }} />;

  const stateCopy = stage === "awaitingOffer"
    ? { title: "Receiving credential offer", message: "The secure connection is ready. Waiting for your institution to send the credential details." }
    : stage === "redirecting"
      ? { title: "Opening credential", message: "The offer arrived and is ready for your review." }
      : { title: "Connecting to your institution", message: "Validating the activation link and opening a secure credential connection." };

  return <OperationStateScreen tone="loading" eyebrow="Credential activation" title={stateCopy.title} message={stateCopy.message} detail="No credential is accepted without your review." />;
}
