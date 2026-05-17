import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View, useWindowDimensions } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StudentCard } from "@/src/components/StudentCard";
import { getCredentialRecord } from "@/src/features/wallet/holderAgent";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const MAX_CARD_WIDTH = 360;

type CredentialAttribute = { name: string; value: string };

const HOLDER_KEYS = new Set([
  "firstName",
  "first_name",
  "givenName",
  "lastName",
  "last_name",
  "familyName",
  "surname",
  "fullName",
  "name",
]);

const PROGRAMME_KEYS = new Set([
  "programme",
  "program",
  "faculty",
  "school",
  "department",
  "year",
  "yearOfStudy",
  "academicYear",
  "studentNumber",
  "student_number",
  "studentId",
]);

const ISSUER_KEYS = new Set(["issuerName", "issuer", "institution", "university"]);

function categorize(attribute: CredentialAttribute) {
  if (HOLDER_KEYS.has(attribute.name)) return "holder" as const;
  if (PROGRAMME_KEYS.has(attribute.name)) return "programme" as const;
  if (ISSUER_KEYS.has(attribute.name)) return "issuer" as const;
  return "other" as const;
}

function humanize(name: string) {
  return name
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CredentialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useWalletSession();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(screenWidth - spacing.xl * 2, MAX_CARD_WIDTH);

  const credentialQuery = useQuery({
    queryKey: ["credential", id],
    queryFn: () => getCredentialRecord(id),
    enabled: Boolean(id),
  });

  const credential = credentialQuery.data;
  const attributes = credential?.credentialAttributes ?? [];

  const grouped = {
    holder: attributes.filter((a) => categorize(a) === "holder"),
    programme: attributes.filter((a) => categorize(a) === "programme"),
    issuer: attributes.filter((a) => categorize(a) === "issuer"),
    other: attributes.filter((a) => categorize(a) === "other"),
  };

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader eyebrow="Credential" title="Detail." />

        {credentialQuery.isLoading ? (
          <Card>
            <Text style={typography.body}>Loading credential…</Text>
          </Card>
        ) : null}

        {credentialQuery.isError ? (
          <Card>
            <Text style={[typography.bodyStrong, { color: colors.error }]}>
              Credential could not be loaded.
            </Text>
          </Card>
        ) : null}

        {credential ? (
          <>
            <View style={{ alignItems: "center" }}>
              <StudentCard credential={credential} width={cardWidth} />
            </View>

            {grouped.holder.length > 0 ? (
              <Card heading="Holder">
                {grouped.holder.map((attr, i) => (
                  <InfoRow
                    key={attr.name}
                    label={humanize(attr.name)}
                    value={attr.value}
                    divider={i < grouped.holder.length - 1}
                  />
                ))}
              </Card>
            ) : null}

            {grouped.programme.length > 0 ? (
              <Card heading="Programme">
                {grouped.programme.map((attr, i) => (
                  <InfoRow
                    key={attr.name}
                    label={humanize(attr.name)}
                    value={attr.value}
                    divider={i < grouped.programme.length - 1}
                  />
                ))}
              </Card>
            ) : null}

            {grouped.issuer.length > 0 ? (
              <Card heading="Issuer">
                {grouped.issuer.map((attr, i) => (
                  <InfoRow
                    key={attr.name}
                    label={humanize(attr.name)}
                    value={attr.value}
                    divider={i < grouped.issuer.length - 1}
                  />
                ))}
              </Card>
            ) : null}

            {grouped.other.length > 0 ? (
              <Card heading="Other attributes">
                {grouped.other.map((attr, i) => (
                  <InfoRow
                    key={attr.name}
                    label={humanize(attr.name)}
                    value={attr.value}
                    divider={i < grouped.other.length - 1}
                  />
                ))}
              </Card>
            ) : null}

            <Card heading="Technical">
              <InfoRow label="Record" value={credential.id} divider />
              {credential.connectionId ? (
                <InfoRow label="Connection" value={credential.connectionId} divider />
              ) : null}
              {credential.state ? (
                <InfoRow label="State" value={credential.state} tone="success" divider />
              ) : null}
              <InfoRow label="Wallet" value={session.walletId ?? "—"} />
            </Card>
          </>
        ) : null}

        <AppButton label="Back to wallet" variant="outline" onPress={() => router.back()} />
      </View>
    </AppScreen>
  );
}
