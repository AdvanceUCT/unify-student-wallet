import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

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

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Activation</Text>
          <Text style={typography.title}>Connecting your credential</Text>
        </View>

        {!isHydrated ? <Text style={typography.body}>Loading wallet session…</Text> : null}

        {isHydrated && !routeActivationUrl ? (
          <Text style={typography.body}>
            Open the activation link from your university to connect your credential.
          </Text>
        ) : null}

        {isHydrated && routeActivationUrl && stage !== "error" ? (
          <View
            style={{
              alignItems: "center",
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              flexDirection: "row",
              gap: spacing.md,
              padding: spacing.lg,
            }}
          >
            {stage === "redirecting" ? (
              <Text style={{ color: colors.success, fontSize: 20, fontWeight: "700" }}>✓</Text>
            ) : (
              <ActivityIndicator color={colors.primary} />
            )}
            <Text style={[typography.body, { flex: 1 }]}>
              {stage === "resolving"
                ? "Verifying activation link…"
                : stage === "awaitingOffer"
                  ? "Receiving your credential offer…"
                  : stage === "redirecting"
                    ? "Offer ready — opening…"
                    : "Preparing…"}
            </Text>
          </View>
        ) : null}

        {stage === "error" && error ? (
          <View style={{ gap: spacing.md }}>
            <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>{error}</Text>
            <AppButton label="Try again" onPress={handleRetry} />
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}
