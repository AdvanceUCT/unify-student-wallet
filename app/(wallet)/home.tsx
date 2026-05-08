import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { StatusPill } from "@/src/components/StatusPill";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { getStudentCredential, getWalletSummary } from "@/src/lib/api/client";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function HomeScreen() {
  const { activationSetup, session } = useWalletSession();
  const holderAgent = useHolderAgent();
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
          <Text style={typography.title}>Campus wallet control center</Text>
          <Text style={typography.body}>Your credential, payment, lock, and holder-agent state are visible from here.</Text>
        </View>

        <View style={{ backgroundColor: colors.primary, borderRadius: 8, padding: spacing.lg, gap: spacing.md }}>
          <View style={{ alignItems: "flex-start" }}>
            <StatusPill label={credential?.lifecycleState ?? "Loading"} tone="success" />
          </View>
          <Text style={[typography.title, { color: colors.white }]}>{credential?.holderName ?? "Student"}</Text>
          <Text style={{ color: colors.primarySoft, fontSize: 16 }}>{credential?.programme ?? "Credential loading"}</Text>
        </View>

        <View style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, padding: spacing.lg, gap: spacing.md }}>
          <InfoRow label="Wallet status" value={session.activationStatus} tone="success" />
          <InfoRow label="Lock status" value={session.lockStatus} tone={session.lockStatus === "unlocked" ? "success" : "warning"} />
          <InfoRow label="Credential expires" value={credential?.expiresAt ?? "-"} tone="warning" />
          <InfoRow label="Available balance" value={summary?.availableBalance ?? "-"} />
          <InfoRow label="Last service check" value={summary?.lastVerification ?? "-"} />
        </View>

        <View style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, padding: spacing.lg, gap: spacing.md }}>
          <Text style={typography.sectionTitle}>Wallet backend state</Text>
          <InfoRow label="Wallet ID" value={session.walletId ?? activationSetup?.walletId ?? "Not activated"} />
          <InfoRow label="Activation ID" value={session.activationId ?? activationSetup?.activationId ?? "Not activated"} />
          <InfoRow label="Activation source" value={session.activationSource ?? activationSetup?.activationSource ?? "Not resolved"} />
          <InfoRow label="Holder agent" value={holderAgent.status} tone={holderAgent.status === "error" ? "warning" : "default"} />
          <InfoRow label="Connection record" value={session.holderConnectionId ?? "Pending"} />
          <InfoRow label="Credential record" value={session.credentialRecordId ?? "Pending"} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppButton label="Scan service QR" href="/(wallet)/scan" />
          <AppButton label="View credential details" href="/(wallet)/credential" variant="secondary" />
          <AppButton label="Review payments" href="/(wallet)/payments" variant="secondary" />
        </View>
      </View>
    </AppScreen>
  );
}
