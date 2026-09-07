/**
 * @fileoverview Confirms the exact payment amount and destination before submitting it.
 * @module app/(wallet)/payment-confirm
 */

import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { InfoRow } from "@/src/components/InfoRow";
import { Rule } from "@/src/components/Rule";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { makePayment } from "@/src/features/payment/paymentApi";
import { useWallet } from "@/src/features/payment/useWallet";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const ERROR_MESSAGES: Record<string, string> = {
  offline: "You are offline. Connect to the internet and try again.",
  insufficient_balance: "Insufficient balance. Top up your wallet and try again.",
  wallet_disabled: "Payments are currently unavailable. Please try again later.",
  session_expired: "Your session expired. Please try again.",
  no_session: "Please accept your student credential to activate payments.",
};

export default function PaymentConfirmScreen() {
  const { vendorId, servicePointId, amountCents, amountZar } = useLocalSearchParams<{
    vendorId: string;
    servicePointId: string;
    amountCents: string;
    amountZar: string;
  }>();
  const { balanceCents, balanceZar, refresh } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newBalanceCents = balanceCents - parseInt(amountCents ?? "0", 10);
  const newBalanceZar = `R ${(newBalanceCents / 100).toFixed(2)}`;

  async function handlePay() {
    setIsLoading(true);
    setError(null);

    const result = await makePayment(
      vendorId,
      servicePointId,
      parseInt(amountCents ?? "0", 10),
      `Payment at ${servicePointId}`,
    );

    setIsLoading(false);

    if (!result.ok) {
      setError(result.code);
      return;
    }

    await refresh();

    router.replace({
      pathname: "/(wallet)/payment-result",
      params: {
        amountZar,
        newBalanceZar: result.data.newBalanceZar,
        transactionId: result.data.transactionId,
        servicePointId,
        paidAt: new Date().toISOString(),
      },
    });
  }

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader eyebrow="Confirm payment" title={`Pay R${amountZar}?`} meta={servicePointId} />

        <Card elevation="md">
          <View style={{ alignItems: "center", gap: spacing.sm }}>
            <Text style={typography.display}>{`R ${amountZar}`}</Text>
          </View>
          <View style={{ marginVertical: spacing.md }}>
            <Rule />
          </View>
          <InfoRow label="Paying to" value={servicePointId} />
          <InfoRow label="From balance" value={balanceZar} />
          <InfoRow label="After payment" value={newBalanceZar} tone={newBalanceCents < 0 ? "error" : "default"} />
        </Card>

        {error ? (
          <Card elevation="sm">
            <Text style={typography.body}>{ERROR_MESSAGES[error] ?? "Payment failed. Please try again."}</Text>
          </Card>
        ) : null}

        <AppButton
          disabled={isLoading}
          label={isLoading ? "Processing..." : `Pay R${amountZar}`}
          onPress={() => void handlePay()}
          size="lg"
        />
        <AppButton disabled={isLoading} label="Cancel" onPress={() => router.back()} variant="secondary" />
      </View>
    </AppScreen>
  );
}
