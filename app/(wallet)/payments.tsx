import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { EmptyState } from "@/src/components/EmptyState";
import { Rule } from "@/src/components/Rule";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { getPaymentHistory } from "@/src/lib/api/client";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function PaymentsScreen() {
  const paymentsQuery = useQuery({
    queryKey: ["payment-history"],
    queryFn: getPaymentHistory,
  });

  const payments = paymentsQuery.data ?? [];

  return (
    <AppScreen>
      <View style={{ gap: spacing["2xl"] }}>
        <ScreenHeader eyebrow="Payments" title="Balance & activity." />

        <View style={{ gap: spacing.md }}>
          <Text style={typography.eyebrow}>Balance</Text>
          <EmptyState
            eyebrow="No balance yet"
            heading="—"
            body="Your wallet balance will appear here once your institution connects a payment source."
          />
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={typography.eyebrow}>Recent activity</Text>
          {payments.length === 0 ? (
            <EmptyState
              eyebrow="No activity"
              body="Payment and verification events will appear here once your wallet has been used at a service point."
              action={
                <AppButton label="Scan service QR" onPress={() => router.push("/(wallet)/scan")} />
              }
            />
          ) : (
            <View>
              <Rule />
              {payments.map((payment) => (
                <View
                  key={payment.id}
                  style={{
                    flexDirection: "row",
                    paddingVertical: spacing.lg,
                    gap: spacing.md,
                  }}
                >
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text style={typography.eyebrow}>{payment.status}</Text>
                    <Text style={typography.bodyStrong}>{payment.vendor}</Text>
                  </View>
                  <Text style={typography.monoLg}>{payment.amount}</Text>
                </View>
              ))}
              <Rule />
            </View>
          )}
        </View>
      </View>
    </AppScreen>
  );
}
