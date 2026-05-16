import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View, useWindowDimensions } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { Rule } from "@/src/components/Rule";
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
      <View style={{ gap: spacing["2xl"] }}>
        <ScreenHeader eyebrow="Credential · Detail" title="Credential record." />

        {credentialQuery.isLoading ? (
          <Text style={typography.body}>Loading credential…</Text>
        ) : null}

        {credentialQuery.isError ? (
          <Text style={[typography.eyebrow, { color: colors.error }]}>
            Credential could not be loaded.
          </Text>
        ) : null}

        {credential ? (
          <>
            <View style={{ alignItems: "center" }}>
              <StudentCard credential={credential} width={cardWidth} />
            </View>

            {grouped.holder.length > 0 ? (
              <Section title="Holder">
                {grouped.holder.map((attr) => (
                  <InfoRow key={attr.name} label={humanize(attr.name)} value={attr.value} />
                ))}
              </Section>
            ) : null}

            {grouped.programme.length > 0 ? (
              <Section title="Programme">
                {grouped.programme.map((attr) => (
                  <InfoRow key={attr.name} label={humanize(attr.name)} value={attr.value} />
                ))}
              </Section>
            ) : null}

            {grouped.issuer.length > 0 ? (
              <Section title="Issuer">
                {grouped.issuer.map((attr) => (
                  <InfoRow key={attr.name} label={humanize(attr.name)} value={attr.value} />
                ))}
              </Section>
            ) : null}

            {grouped.other.length > 0 ? (
              <Section title="Other attributes">
                {grouped.other.map((attr) => (
                  <InfoRow key={attr.name} label={humanize(attr.name)} value={attr.value} />
                ))}
              </Section>
            ) : null}

            <Section title="Technical">
              <InfoRow label="Record" value={credential.id} />
              {credential.connectionId ? (
                <InfoRow label="Connection" value={credential.connectionId} />
              ) : null}
              {credential.state ? (
                <InfoRow label="State" value={credential.state} tone="success" />
              ) : null}
              <InfoRow label="Wallet" value={session.walletId ?? "—"} divider={false} />
            </Section>
          </>
        ) : null}

        <AppButton label="Back to wallet" variant="outline" onPress={() => router.back()} />
      </View>
    </AppScreen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.eyebrow}>{title}</Text>
      <Rule />
      <View>{children}</View>
    </View>
  );
}
