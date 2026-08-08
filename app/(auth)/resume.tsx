import { router } from "expo-router";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import type { PendingFlowKind } from "@/src/features/wallet/sessionTypes";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

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
  const Icon = error ? AlertTriangle : kind === "home" ? ArrowRight : ShieldCheck;
  const tone = error ? colors.warning : colors.primary;
  const toneSoft = error ? colors.warningSoft : colors.primarySoft;

  return (
    <AppScreen scrollable={false} contentContainerStyle={{ paddingTop: spacing["3xl"] }}>
      <View style={{ flex: 1, justifyContent: "center", gap: spacing["2xl"], paddingBottom: spacing.xl }}>
        <View style={{ alignItems: "center", gap: spacing.lg }}>
          <View
            style={{
              width: 76,
              height: 76,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: toneSoft,
              borderRadius: 38,
            }}
          >
            <Icon color={tone} size={30} strokeWidth={1.8} />
          </View>
          <View style={{ alignItems: "center", gap: spacing.sm, maxWidth: 340 }}>
            <Text style={[typography.eyebrow, { color: tone }]}>{error ? "Resume interrupted" : copy.eyebrow}</Text>
            <Text accessibilityRole="header" style={[typography.title, { textAlign: "center" }]}>
              {error ? "Could not resume this request" : copy.title}
            </Text>
            <Text accessibilityLiveRegion="polite" style={[typography.bodyLg, { textAlign: "center" }]}>
              {error ?? copy.message}
            </Text>
          </View>
        </View>

        {error ? (
          <View style={{ gap: spacing.md }}>
            <AppButton label="Try again" size="lg" onPress={handleRetry} />
            <AppButton label="Continue to wallet" variant="ghost" onPress={() => void handleContinue()} />
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}
