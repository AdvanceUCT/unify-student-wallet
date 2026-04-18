import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { StatusPill } from "@/src/components/StatusPill";
import { getStudentCredential } from "@/src/lib/api/client";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function CredentialScreen() {
  const credentialQuery = useQuery({
    queryKey: ["student-credential"],
    queryFn: getStudentCredential,
  });

  const credential = credentialQuery.data;

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Credential</Text>
          <Text style={typography.title}>Student status</Text>
          <Text style={typography.body}>Present this credential when a service point needs proof of status.</Text>
        </View>

        {credential ? (
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              padding: spacing.lg,
              gap: spacing.lg,
            }}
          >
            <View style={{ alignItems: "flex-start", gap: spacing.sm }}>
              <StatusPill label={credential.status} tone="success" />
              <Text style={[typography.title, { color: colors.white }]}>{credential.holderName}</Text>
              <Text style={{ color: colors.primarySoft, fontSize: 16 }}>{credential.programme}</Text>
            </View>

            <View style={{ backgroundColor: colors.white, borderRadius: 8, padding: spacing.md, gap: spacing.sm }}>
              <InfoRow label="Student number" value={credential.studentNumber} />
              <InfoRow label="Issuer" value={credential.issuer} />
              <InfoRow label="Expires" value={credential.expiresAt} tone="warning" />
            </View>
          </View>
        ) : (
          <Text style={typography.body}>Loading credential...</Text>
        )}
      </View>
    </AppScreen>
  );
}
