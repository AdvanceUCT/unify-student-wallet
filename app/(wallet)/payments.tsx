import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { getPaymentHistory } from "@/src/lib/api/client";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function PaymentsScreen() {
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
          <Text style={typography.body}>Track wallet payment attempts and service-point transactions.</Text>
        </View>

        <View style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, padding: spacing.lg, gap: spacing.lg }}>
          {(paymentsQuery.data ?? []).map((payment) => (
            <InfoRow key={payment.id} label={payment.vendor} value={`${payment.amount} - ${payment.status}`} />
          ))}
        </View>
      </View>
    </AppScreen>
  );
}
