import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { getPaymentHistory } from "@/src/lib/api/client";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function PaymentsScreen() {
  const { session } = useWalletSession();
  const [topUpLink, setTopUpLink] = useState<string | null>(null);
  const paymentsQuery = useQuery({
    queryKey: ["payment-history"],
    queryFn: getPaymentHistory,
  });

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Payments</Text>
          <Text style={typography.title}>Recent activity</Text>
          <Text style={typography.body}>Track wallet payment attempts, service-point transactions, and demo top-up requests.</Text>
        </View>

        <View style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, padding: spacing.lg, gap: spacing.md }}>
          <Text style={typography.sectionTitle}>Wallet balance backend</Text>
          <InfoRow label="Wallet ID" value={session.walletId ?? "Demo wallet"} />
          <InfoRow label="Credential record" value={session.credentialRecordId ?? "Demo credential"} />
          <InfoRow label="Top-up link" value={topUpLink ?? "Not generated"} />
          <View style={{ gap: spacing.sm }}>
            <AppButton
              label="Generate demo top-up link"
              onPress={() => setTopUpLink(`https://example.test/top-up/${session.walletId ?? "wallet-demo-001"}`)}
            />
            <AppButton label="Scan payment QR" href="/(wallet)/scan" variant="secondary" />
          </View>
        </View>

        <View style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, padding: spacing.lg, gap: spacing.lg }}>
          {(paymentsQuery.data ?? []).map((payment) => (
            <InfoRow key={payment.id} label={payment.vendor} value={`${payment.amount} - ${payment.status}`} />
          ))}
          {paymentsQuery.isLoading ? <Text style={typography.body}>Loading transactions...</Text> : null}
          {paymentsQuery.isError ? (
            <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>Payment history could not be loaded.</Text>
          ) : null}
        </View>
      </View>
    </AppScreen>
  );
}
