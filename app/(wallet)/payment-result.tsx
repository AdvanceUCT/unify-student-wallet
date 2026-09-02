/**
 * @fileoverview Confirms a completed student-to-vendor payment with a summary.
 * @module app/(wallet)/payment-result
 */

import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle } from "lucide-react-native";
import { View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { formatDateTime } from "@/src/features/wallet/credentialDisplay";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { spacing } from "@/src/theme/spacing";

export default function PaymentResultScreen() {
  const colors = useThemePalette();
  const { amountZar, newBalanceZar, transactionId, servicePointId, paidAt } = useLocalSearchParams<{
    amountZar: string;
    newBalanceZar: string;
    transactionId: string;
    servicePointId: string;
    paidAt: string;
  }>();

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl, alignItems: "center" }}>
        <CheckCircle color={colors.success} size={56} />
        <ScreenHeader eyebrow="Payment complete" title="Paid." meta={`at ${servicePointId}`} />

        <Card heading="Payment summary" style={{ alignSelf: "stretch" }}>
          <InfoRow label="Amount paid" value={`R ${amountZar}`} />
          <InfoRow label="New balance" value={newBalanceZar} />
          <InfoRow label="Service point" value={servicePointId} />
          <InfoRow label="Time" value={formatDateTime(paidAt)} />
          <InfoRow label="Reference" value={`${transactionId.slice(0, 8)}...`} />
        </Card>

        <AppButton label="Done" onPress={() => router.replace("/(wallet)/payment-wallet")} size="lg" />
      </View>
    </AppScreen>
  );
}
