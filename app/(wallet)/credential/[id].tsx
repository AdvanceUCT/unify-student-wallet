import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { IdCard } from "lucide-react-native";
import { Text, useWindowDimensions, View } from "react-native";

import { AnimatedEntry } from "@/src/components/AnimatedEntry";
import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { CredentialSkeleton } from "@/src/components/Skeleton";
import { EmptyState } from "@/src/components/EmptyState";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StudentCard } from "@/src/components/StudentCard";
import { getCredentialRecordLazy } from "@/src/features/wallet/holderAgentRuntime";
import { colors } from "@/src/theme/colors";
import { motion } from "@/src/theme/motion";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type CredentialAttribute = { name: string; value: string };
const HOLDER_KEYS = new Set(["firstName", "first_name", "givenName", "lastName", "last_name", "familyName", "surname", "fullName", "name"]);
const PROGRAMME_KEYS = new Set(["programme", "program", "faculty", "school", "department", "year", "yearOfStudy", "academicYear", "studentNumber", "student_number", "studentId"]);
const ISSUER_KEYS = new Set(["issuerName", "issuer", "institution", "university"]);

function category(attribute: CredentialAttribute) {
  if (HOLDER_KEYS.has(attribute.name)) return "Holder";
  if (PROGRAMME_KEYS.has(attribute.name)) return "Student record";
  if (ISSUER_KEYS.has(attribute.name)) return "Issuer";
  return "Additional information";
}

function humanize(name: string) {
  return name.replace(/[_-]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function CredentialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - spacing.xl * 2, 430);
  const credentialQuery = useQuery({ queryKey: ["credential", id], queryFn: () => getCredentialRecordLazy(id), enabled: Boolean(id) });
  const credential = credentialQuery.data;
  const attributes = credential?.credentialAttributes ?? [];
  const groups = ["Holder", "Student record", "Issuer", "Additional information"].map((title) => ({ title, attributes: attributes.filter((attribute) => category(attribute) === title) })).filter((group) => group.attributes.length);

  return (
    <AppScreen>
      <ScreenHeader eyebrow="Verifiable document" title="Credential details" />
      {credentialQuery.isLoading ? <CredentialSkeleton /> : null}
      {credentialQuery.isError || (!credentialQuery.isLoading && !credential) ? <EmptyState icon={IdCard} eyebrow="Credential unavailable" heading="Could not open this credential" body="The credential may have been removed or the wallet agent may be unavailable." action={<AppButton label="Back to credentials" onPress={() => router.back()} />} /> : null}
      {credential ? (
        <View style={{ gap: spacing["2xl"] }}>
          <AnimatedEntry><View style={{ alignItems: "center" }}><StudentCard credential={credential} width={cardWidth} /></View></AnimatedEntry>
          {groups.map((group, groupIndex) => (
            <AnimatedEntry key={group.title} delay={(groupIndex + 1) * motion.stagger}>
              <View>
                <Text style={[typography.sectionTitle, { marginBottom: spacing.sm }]}>{group.title}</Text>
                <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule }}>
                  {group.attributes.map((attribute, index) => <InfoRow key={attribute.name} label={humanize(attribute.name)} value={attribute.value} divider={index < group.attributes.length - 1} />)}
                </View>
              </View>
            </AnimatedEntry>
          ))}
          <AppButton label="Back to credentials" variant="outline" onPress={() => router.back()} />
        </View>
      ) : null}
    </AppScreen>
  );
}
