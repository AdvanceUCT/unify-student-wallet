import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { StatusPill } from "@/src/components/StatusPill";
import { getStudentCredential, getWalletSummary } from "@/src/lib/api/client";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function HomeScreen() {
  const credentialQuery = useQuery({
    queryKey: ["student-credential"],
    queryFn: getStudentCredential,
  });
  const summaryQuery = useQuery({
    queryKey: ["wallet-summary"],
    queryFn: getWalletSummary,
  });

  const credential = credentialQuery.data;
  const summary = summaryQuery.data;

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Wallet</Text>
          <Text style={typography.title}>Ready for campus services</Text>
          <Text style={typography.body}>Your active student credential is available for service checks.</Text>
        </View>

        <View style={{ backgroundColor: colors.primary, borderRadius: 8, padding: spacing.lg, gap: spacing.md }}>
          <View style={{ alignItems: "flex-start" }}>
            <StatusPill label={credential?.status ?? "Loading"} tone="success" />
          </View>
          <Text style={[typography.title, { color: colors.white }]}>{credential?.holderName ?? "Student"}</Text>
          <Text style={{ color: colors.primarySoft, fontSize: 16 }}>{credential?.programme ?? "Credential loading"}</Text>
        </View>

        <View style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, padding: spacing.lg, gap: spacing.md }}>
          <InfoRow label="Credential expires" value={credential?.expiresAt ?? "-"} tone="warning" />
          <InfoRow label="Available balance" value={summary?.availableBalance ?? "-"} />
          <InfoRow label="Last service check" value={summary?.lastVerification ?? "-"} />
        </View>

        <AppButton label="Scan service QR" href="/(wallet)/scan" />
      </View>
    </AppScreen>
  );
}
