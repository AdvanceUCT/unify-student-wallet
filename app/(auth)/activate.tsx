import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { mockStudentProfile } from "@/src/lib/api/mockStudent";
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
  const { isHydrated, prepareActivationFromLink } = useWalletSession();
  const params = useLocalSearchParams<{ oob?: string | string[]; token?: string | string[] }>();
  const routeActivationUrl = useMemo(() => activationUrlFromParams(params), [params]);
  const processedActivationUrlRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const invitationStatus = error
    ? "Needs attention"
    : status
      ? "Accepted"
      : routeActivationUrl
        ? "Checking link"
        : "Waiting for link";
  const invitationTone = error ? "warning" : status ? "success" : "default";

  const handleActivationLink = useCallback(
    async (url: string) => {
      const result = await prepareActivationFromLink(url);

      if (result.ok) {
        setError(null);
        setStatus("Activation link accepted. Set a PIN to store the credential.");
        return;
      }

      setStatus(null);
      setError(result.error);
    },
    [prepareActivationFromLink],
  );

  useEffect(() => {
    if (!isHydrated || !routeActivationUrl || processedActivationUrlRef.current === routeActivationUrl) {
      return;
    }

    processedActivationUrlRef.current = routeActivationUrl;
    void handleActivationLink(routeActivationUrl);
  }, [handleActivationLink, isHydrated, routeActivationUrl]);

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Activation</Text>
          <Text style={typography.title}>Connect your student credential</Text>
          <Text style={typography.body}>
            Open the activation link from your university to connect your student credential.
          </Text>
        </View>

        <View
          style={{
            borderColor: colors.border,
            borderRadius: 8,
            borderWidth: 1,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <InfoRow label="Student" value={mockStudentProfile.name} />
          <InfoRow label="Institution" value={mockStudentProfile.institution} />
          <InfoRow label="Activation link" value={invitationStatus} tone={invitationTone} />
        </View>

        <View style={{ gap: spacing.sm }}>
          {error ? <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>{error}</Text> : null}
          {status ? <Text style={{ color: colors.success, fontSize: 14, fontWeight: "700" }}>{status}</Text> : null}
          {!routeActivationUrl ? (
            <Text style={typography.body}>No activation link is open in this session.</Text>
          ) : null}
          {!isHydrated ? <Text style={typography.body}>Loading wallet session...</Text> : null}
        </View>
      </View>
    </AppScreen>
  );
}
