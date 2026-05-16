import { router, useLocalSearchParams } from "expo-router";
import { Check as CheckIcon } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Rule } from "@/src/components/Rule";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type Stage = "idle" | "resolving" | "awaitingOffer" | "redirecting" | "error";

const AWAIT_OFFER_TIMEOUT_MS = 30_000;

const STAGE_STEPS: { key: Exclude<Stage, "idle" | "error">; label: string }[] = [
  { key: "resolving", label: "Resolving activation link" },
  { key: "awaitingOffer", label: "Receiving credential offer" },
  { key: "redirecting", label: "Opening credential" },
];

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
  const { isHydrated, pendingOfferIds, processIncomingLink } = useWalletSession();
  const params = useLocalSearchParams<{ oob?: string | string[]; token?: string | string[] }>();
  const routeActivationUrl = useMemo(() => activationUrlFromParams(params), [params]);
  const processedActivationUrlRef = useRef<string | null>(null);
  const baselineOfferCountRef = useRef<number>(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
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
        router.replace("/(auth)/set-pin");
        return;
      }

      setStage("awaitingOffer");
    })();
  }, [isHydrated, pendingOfferIds.length, processIncomingLink, retryToken, routeActivationUrl]);

  useEffect(() => {
    if (stage !== "awaitingOffer") {
      return;
    }

    if (pendingOfferIds.length > baselineOfferCountRef.current) {
      setStage("redirecting");
      router.replace("/(wallet)/offers");
    }
  }, [pendingOfferIds.length, stage]);

  useEffect(() => {
    if (stage !== "awaitingOffer") {
      return;
    }

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

  const stageIndex = STAGE_STEPS.findIndex((s) => s.key === stage);

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          eyebrow="Activation"
          title="Connecting credential."
          meta={routeActivationUrl ? "Hold on — this only takes a moment." : "Open an activation link to begin."}
        />

        {!isHydrated ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={typography.body}>Loading wallet session…</Text>
          </View>
        ) : null}

        {isHydrated && !routeActivationUrl ? (
          <Text style={typography.bodyLg}>
            Open the activation link from your university to receive your credential.
          </Text>
        ) : null}

        {isHydrated && routeActivationUrl && stage !== "error" ? (
          <View style={{ gap: 0 }}>
            <Rule variant="hairline" />
            {STAGE_STEPS.map((entry, index) => {
              const isActive = index === stageIndex;
              const isDone = stageIndex > index;
              const isPending = stageIndex < index;

              return (
                <View key={entry.key}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.md,
                      paddingVertical: spacing.lg,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isDone ? (
                        <CheckIcon color={colors.primary} size={16} strokeWidth={2} />
                      ) : isActive ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                      ) : (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderColor: colors.ruleSoft,
                            borderWidth: 1,
                          }}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        typography.body,
                        {
                          color: isPending ? colors.inkSubtle : colors.ink,
                          fontFamily: isActive ? "IBMPlexSans_500Medium" : "IBMPlexSans_400Regular",
                          flex: 1,
                        },
                      ]}
                    >
                      {entry.label}
                    </Text>
                    <Text style={[typography.eyebrow, { color: isPending ? colors.inkSubtle : colors.primary }]}>
                      {isDone ? "Done" : isActive ? "…" : "Wait"}
                    </Text>
                  </View>
                  <Rule variant="hairline" />
                </View>
              );
            })}
          </View>
        ) : null}

        {stage === "error" && error ? (
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.eyebrow, { color: colors.error }]}>Activation failed</Text>
            <Text style={typography.bodyLg}>{error}</Text>
            <AppButton label="Try again" onPress={handleRetry} size="lg" />
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}
