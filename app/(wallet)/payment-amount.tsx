/**
 * @fileoverview Collects the amount to pay after scanning a vendor's static payment QR code.
 * @module app/(wallet)/payment-amount
 */

import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppTextField } from "@/src/components/AppTextField";
import { Card } from "@/src/components/Card";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Tag } from "@/src/components/Tag";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { usePaymentWallet } from "@/src/features/payment/usePaymentWallet";
import { useQrPayment } from "@/src/features/payment/useQrPayment";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  not_verified: "Your student credential must be active to pay. Check your wallet.",
  insufficient_balance: "Insufficient balance. Load your wallet from the Payment wallet screen.",
  contract_error: "Payment failed. Check your connection and try again.",
};

export default function PaymentAmountScreen() {
  const colors = useThemePalette();
  const { vendorId, servicePointId } = useLocalSearchParams<{ vendorId: string; servicePointId: string }>();
  const { balanceZar, isVerified, isLoading: isWalletLoading } = usePaymentWallet();
  const { processPayment, isProcessing } = useQrPayment();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = parseFloat(amount);
  const hasValidAmount = amount.length > 0 && !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const hasZeroBalance = !isWalletLoading && (balanceZar === null || balanceZar === "R 0.00");

  async function handlePay() {
    if (!servicePointId || !vendorId) return;
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setError(null);

    const payload = {
      type: "payment" as const,
      vendorId,
      servicePointId,
    };

    const result = await processPayment(payload, parsedAmount);

    if (result.success) {
      router.replace({
        pathname: "/(wallet)/payment-result",
        params: {
          amountPaid: result.amountPaid,
          servicePointId: result.servicePointId,
          txHash: result.txHash ?? "",
          discountApplied: String(result.discountApplied),
          paidAt: new Date().toISOString(),
        },
      });
      return;
    }

    setError(result.error ?? "unknown");
  }

  return (
    <AppScreen
      footer={
        <View style={{ gap: spacing.sm }}>
          <AppButton
            disabled={isProcessing || !hasValidAmount}
            label={isProcessing ? "Processing..." : "Pay now"}
            onPress={() => void handlePay()}
            size="lg"
          />
          <AppButton label="Cancel" onPress={() => router.back()} variant="secondary" />
        </View>
      }
    >
      <ScreenHeader eyebrow="PAYMENT" title="Enter amount" meta={`Paying at ${servicePointId ?? "—"}`} />

      <View style={{ gap: spacing.lg }}>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={typography.eyebrow}>Available balance</Text>
              <Text style={typography.heading}>{balanceZar ?? "R 0.00"}</Text>
            </View>
            <Tag label="Sepolia testnet" tone="muted" />
          </View>
          {hasZeroBalance ? (
            <Text style={[typography.body, { color: colors.warning, marginTop: spacing.sm }]}>
              Insufficient funds. Load your wallet first.
            </Text>
          ) : null}
        </Card>

        <Card>
          <View style={{ gap: spacing.md }}>
            <AppTextField
              keyboardType="decimal-pad"
              label="Amount to pay (R)"
              maxLength={8}
              onChangeText={setAmount}
              placeholder="0.00"
              style={{ fontSize: 32, fontFamily: "IBMPlexSans_700Bold", textAlign: "center", minHeight: 68 }}
              value={amount}
            />
            {hasValidAmount ? (
              isVerified ? (
                <Text style={[typography.bodyStrong, { color: colors.success, textAlign: "center" }]}>
                  With your UCT student discount (20%): You pay R {(parsedAmount * 0.8).toFixed(2)}
                </Text>
              ) : (
                <Text style={[typography.bodyStrong, { color: colors.warning, textAlign: "center" }]}>
                  No student discount — credential not active
                </Text>
              )
            ) : null}
          </View>
        </Card>

        {error ? (
          <Card style={{ borderColor: colors.error }}>
            <Text style={[typography.bodyStrong, { color: colors.error }]}>
              {PAYMENT_ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
            </Text>
          </Card>
        ) : null}
      </View>
    </AppScreen>
  );
}
