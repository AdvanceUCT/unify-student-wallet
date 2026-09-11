/**
 * @fileoverview Displays a server-confirmed wallet payment receipt.
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
import { formatZarMinor } from "@/src/features/payment/money";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { formatDateTime } from "@/src/features/wallet/credentialDisplay";
import { spacing } from "@/src/theme/spacing";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default function PaymentResultScreen() {
  const colors = useThemePalette();
  const params = useLocalSearchParams<{
    amountMinor?: string | string[];
    resultingBalanceMinor?: string | string[];
    transactionId?: string | string[];
    vendorName?: string | string[];
    branchName?: string | string[];
    completedAt?: string | string[];
  }>();
  const amountMinor = Number(firstParam(params.amountMinor));
  const resultingBalanceMinor = Number(firstParam(params.resultingBalanceMinor));
  const transactionId = firstParam(params.transactionId);
  const vendorName = firstParam(params.vendorName);
  const branchName = firstParam(params.branchName);
  const completedAt = firstParam(params.completedAt);

  return (
    <AppScreen footer={<AppButton label="Done" onPress={() => router.replace("/(wallet)/payments")} size="lg" />}>
      <View style={{ alignItems: "center", gap: spacing.xl }}>
        <CheckCircle color={colors.success} size={56} strokeWidth={1.7} />
        <ScreenHeader eyebrow="Payment complete" title="Paid" meta={`${vendorName} · ${branchName}`} />
        <Card heading="Payment receipt" style={{ alignSelf: "stretch" }}>
          <InfoRow divider label="Amount" value={formatZarMinor(amountMinor)} />
          <InfoRow divider label="Balance" value={formatZarMinor(resultingBalanceMinor)} />
          <InfoRow divider label="Time" value={formatDateTime(completedAt)} />
          <InfoRow label="Reference" value={transactionId} />
        </Card>
      </View>
    </AppScreen>
  );
}
