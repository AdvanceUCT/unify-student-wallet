import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

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
  const { isHydrated, processIncomingLink } = useWalletSession();
  const params = useLocalSearchParams<{ oob?: string | string[]; token?: string | string[] }>();
  const routeActivationUrl = useMemo(() => activationUrlFromParams(params), [params]);
  const processedActivationUrlRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated || !routeActivationUrl || processedActivationUrlRef.current === routeActivationUrl) {
      return;
    }

    processedActivationUrlRef.current = routeActivationUrl;
    void (async () => {
      const result = await processIncomingLink(routeActivationUrl);
      if (!result.ok) {
        setError(result.error);
      }
    })();
  }, [isHydrated, processIncomingLink, routeActivationUrl]);

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Activation</Text>
          <Text style={typography.title}>Connecting your credential</Text>
          <Text style={typography.body}>
            {routeActivationUrl
              ? "Reviewing the activation link…"
              : "Open the activation link from your university to connect your credential."}
          </Text>
        </View>

        {error ? (
          <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>{error}</Text>
        ) : null}

        {!isHydrated ? <Text style={typography.body}>Loading wallet session…</Text> : null}
      </View>
    </AppScreen>
  );
}
