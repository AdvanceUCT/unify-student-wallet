import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Wallet as WalletIcon, Receipt as ReceiptIcon } from "lucide-react-native";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { getPaymentHistory } from "@/src/lib/api/client";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function PaymentsScreen() {
  // Payments are still a backend placeholder, but this keeps the screen ready to wire.
  const paymentsQuery = useQuery({
    queryKey: ["payment-history"],
    queryFn: getPaymentHistory,
  });

  const payments = paymentsQuery.data ?? [];

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader eyebrow="Payments" title="Balance & activity." />

        <Card elevation="md">
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <WalletIcon color={colors.primary} size={18} strokeWidth={1.6} />
              <Text style={typography.eyebrow}>Balance</Text>
            </View>
            <Text style={typography.display}>—</Text>
            <Text style={typography.body}>
              Your wallet balance will appear here once your institution connects a payment source.
            </Text>
          </View>
        </Card>

        <View style={{ gap: spacing.md }}>
          <Text style={typography.heading}>Recent activity</Text>
          {payments.length === 0 ? (
            <EmptyState
              icon={ReceiptIcon}
              eyebrow="No activity"
              body="Payment and verification events will appear here once your wallet has been used at a service point."
              action={
                <AppButton label="Scan service QR" onPress={() => router.push("/(wallet)/scan")} />
              }
            />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {payments.map((payment) => (
                <Card key={payment.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <Text style={typography.eyebrow}>{payment.status}</Text>
                      <Text style={typography.bodyStrong}>{payment.vendor}</Text>
                    </View>
                    <Text style={typography.monoLg}>{payment.amount}</Text>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </View>
    </AppScreen>
  );
}
