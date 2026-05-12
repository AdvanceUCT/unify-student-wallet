import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View, useWindowDimensions } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { StudentCard } from "@/src/components/StudentCard";
import { getCredentialRecord } from "@/src/features/wallet/holderAgent";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const MAX_CARD_WIDTH = 360;

type CredentialAttribute = { name: string; value: string };

function findAttribute(attributes: CredentialAttribute[] | undefined, name: string) {
  return attributes?.find((attribute) => attribute.name === name)?.value;
}

export default function CredentialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useWalletSession();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(screenWidth - spacing.lg * 2, MAX_CARD_WIDTH);

  const credentialQuery = useQuery({
    queryKey: ["credential", id],
    queryFn: () => getCredentialRecord(id),
    enabled: Boolean(id),
  });

  const credential = credentialQuery.data;
  const attributes = credential?.credentialAttributes ?? [];
  const firstName = findAttribute(attributes, "firstName");
  const lastName = findAttribute(attributes, "lastName");
  const holderName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Credential</Text>
          <Text style={typography.title}>{holderName || "Credential detail"}</Text>
          <Text style={typography.body}>All information stored on this credential record.</Text>
        </View>

        {credentialQuery.isLoading ? <Text style={typography.body}>Loading credential…</Text> : null}

        {credentialQuery.isError ? (
          <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>
            Credential could not be loaded.
          </Text>
        ) : null}

        {credential ? (
          <>
            <View style={{ alignItems: "center" }}>
              <StudentCard credential={credential} width={cardWidth} />
            </View>

            <View
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: 8,
                borderWidth: 1,
                padding: spacing.lg,
                gap: spacing.md,
              }}
            >
              <Text style={typography.sectionTitle}>Attributes</Text>
              {attributes.length > 0 ? (
                attributes.map((attribute) => (
                  <InfoRow key={attribute.name} label={attribute.name} value={attribute.value} />
                ))
              ) : (
                <Text style={typography.body}>No attributes available.</Text>
              )}
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
              <Text style={typography.sectionTitle}>Storage records</Text>
              <InfoRow label="Wallet ID" value={session.walletId ?? "-"} />
              <InfoRow label="Credential record" value={credential.id} />
              {credential.connectionId ? <InfoRow label="Connection" value={credential.connectionId} /> : null}
              {credential.state ? <InfoRow label="State" value={credential.state} tone="success" /> : null}
            </View>
          </>
        ) : null}

        <AppButton label="Back to wallet" variant="secondary" onPress={() => router.back()} />
      </View>
    </AppScreen>
  );
}
