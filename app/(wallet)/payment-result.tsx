/**
 * @fileoverview Confirms a completed campus payment after a payment QR is processed.
 * @module app/(wallet)/payment-result
 */

import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle } from "lucide-react-native";
import { Linking, Pressable, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

function truncateTxHash(txHash: string) {
  return `${txHash.slice(0, 10)}...${txHash.slice(-6)}`;
}

export default function PaymentResultScreen() {
  const colors = useThemePalette();
  const params = useLocalSearchParams<{
    amountPaid?: string;
    servicePointId?: string;
    txHash?: string;
    discountApplied?: string;
    paidAt?: string;
  }>();

  const amountPaid = params.amountPaid ?? "—";
  const servicePointId = params.servicePointId ?? "—";
  const txHash = params.txHash ?? "";
  const discountApplied = params.discountApplied === "true";
  const paidAt = params.paidAt ? new Date(params.paidAt).toLocaleString() : "—";

  return (
    <AppScreen
      footer={<AppButton label="Done" onPress={() => router.replace("/(wallet)/home")} size="lg" />}
    >
      <View style={{ alignItems: "center", gap: spacing.md, marginBottom: spacing.xl }}>
        <CheckCircle color={colors.success} size={56} strokeWidth={1.6} />
      </View>

      <ScreenHeader eyebrow="Payment" title="Payment approved." meta={`Paid at ${servicePointId}`} />

      <Card>
        <InfoRow divider label="Amount paid" value={amountPaid} />
        <InfoRow divider label="Student discount" value={discountApplied ? "Yes — 20% UCT rate applied" : "No discount"} />
        <InfoRow divider label="Service point" value={servicePointId} />
        <InfoRow divider label="Time" value={paidAt} />
        <InfoRow divider label="Transaction" value={txHash ? truncateTxHash(txHash) : "—"} />
        <InfoRow label="Network" value="Sepolia testnet" />
      </Card>

      {txHash ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(`https://sepolia.etherscan.io/tx/${txHash}`)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: spacing.md,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={typography.body}>View transaction</Text>
          <Text style={[typography.bodyStrong, { color: colors.primary }]}>sepolia.etherscan.io →</Text>
        </Pressable>
      ) : null}
    </AppScreen>
  );
}
