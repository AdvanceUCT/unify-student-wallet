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
  const { pendingOfferIds, session } = useWalletSession();
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
  const hasCredential = Boolean(credential);
  const pendingCount = pendingOfferIds.length;

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Wallet</Text>
          <Text style={typography.title}>Campus wallet control center</Text>
          <Text style={typography.body}>Your credentials, payments, and wallet status are visible from here.</Text>
        </View>

        {pendingCount > 0 ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              padding: spacing.lg,
              gap: spacing.sm,
            }}
          >
            <Text style={typography.sectionTitle}>
              {`You have ${pendingCount} pending credential offer${pendingCount === 1 ? "" : "s"}.`}
            </Text>
            <AppButton label="Review offers" href="/(wallet)/offers" />
          </View>
        ) : null}

        {hasCredential ? (
          <>
            <View style={{ backgroundColor: colors.primary, borderRadius: 8, padding: spacing.lg, gap: spacing.md }}>
              <View style={{ alignItems: "flex-start" }}>
                <StatusPill label={credential?.lifecycleState ?? "Active"} tone="success" />
              </View>
              <Text style={[typography.title, { color: colors.white }]}>{credential?.holderName ?? "Student"}</Text>
              <Text style={{ color: colors.primarySoft, fontSize: 16 }}>{credential?.programme ?? "Credential"}</Text>
            </View>

            <View style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, padding: spacing.lg, gap: spacing.md }}>
              <InfoRow
                label="Lock status"
                value={session.lockStatus}
                tone={session.lockStatus === "unlocked" ? "success" : "warning"}
              />
              <InfoRow label="Credential expires" value={credential?.expiresAt ?? "-"} tone="warning" />
              <InfoRow label="Available balance" value={summary?.availableBalance ?? "-"} />
              <InfoRow label="Last service check" value={summary?.lastVerification ?? "-"} />
            </View>
          </>
        ) : (
          <View
            style={{
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              padding: spacing.lg,
              gap: spacing.md,
            }}
          >
            <Text style={typography.sectionTitle}>Your wallet is ready</Text>
            <Text style={typography.body}>
              Scan a QR or open an activation link from your university to receive your first credential.
            </Text>
          </View>
        )}

        <View style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, padding: spacing.lg, gap: spacing.md }}>
          <Text style={typography.sectionTitle}>Wallet diagnostics</Text>
          <InfoRow label="Wallet ID" value={session.walletId ?? "-"} />
          <InfoRow
            label="Holder agent"
            value={holderAgent.status}
            tone={holderAgent.status === "error" ? "warning" : "default"}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppButton label="Scan service QR" href="/(wallet)/scan" />
          {hasCredential ? (
            <AppButton label="View credential details" href="/(wallet)/credential" variant="secondary" />
          ) : null}
          <AppButton label="Review payments" href="/(wallet)/payments" variant="secondary" />
        </View>
      </View>
    </AppScreen>
  );
}
