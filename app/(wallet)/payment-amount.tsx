/**
 * @fileoverview Collects the payment amount after a vendor service-point QR scan.
 * @module app/(wallet)/payment-amount
 */

import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { useWallet } from "@/src/features/payment/useWallet";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function PaymentAmountScreen() {
  const colors = useThemePalette();
  const { vendorId, servicePointId } = useLocalSearchParams<{ vendorId: string; servicePointId: string }>();
  const { balanceCents, balanceZar, hasCredential, isActive } = useWallet();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const credentialNotReady = !hasCredential || !isActive;

  const parsed = parseFloat(amount);
  const isValidAmount = Number.isFinite(parsed) && parsed > 0;
  const amountCentsEntered = isValidAmount ? Math.round(parsed * 100) : 0;
  const insufficientBalance = isValidAmount && amountCentsEntered > balanceCents;

  function handleReview() {
    if (!parsed || parsed <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    const amountCents = Math.round(parsed * 100);
    if (amountCents > balanceCents) {
      setError("Insufficient balance");
      return;
    }
    router.push({
      pathname: "/(wallet)/payment-confirm",
      params: { vendorId, servicePointId, amountCents: String(amountCents), amountZar: parsed.toFixed(2) },
    });
  }

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader eyebrow="Payment" title="How much?" meta={`Paying at ${servicePointId}`} />

        {credentialNotReady ? (
          <Card elevation="sm">
            <Text style={typography.body}>
              Your wallet activates once you accept your student credential. You can keep going, but paying will need
              that first.
            </Text>
          </Card>
        ) : null}

        <Card>
          <View style={{ gap: spacing.sm }}>
            <Text style={typography.body}>{`Available balance: ${balanceZar}`}</Text>
            {balanceCents === 0 && !credentialNotReady ? (
              <>
                <Text style={[typography.caption, { color: colors.warning }]}>Your balance is R 0.00. Top up before paying.</Text>
                <AppButton label="Top up now" onPress={() => router.push("/(wallet)/topup-amount")} />
              </>
            ) : null}
          </View>
        </Card>

        <Card>
          <View style={{ gap: spacing.sm }}>
            <Text style={typography.label}>Amount (R)</Text>
            <TextInput
              accessibilityLabel="Amount in Rand"
              autoFocus
              keyboardType="decimal-pad"
              onChangeText={(text) => { setAmount(text); setError(null); }}
              placeholder="0.00"
              placeholderTextColor={colors.inkSubtle}
              style={{
                fontFamily: "IBMPlexSans_700Bold",
                fontSize: 40,
                color: colors.ink,
                textAlign: "center",
                paddingVertical: spacing.md,
              }}
              value={amount}
            />
            {insufficientBalance ? (
              <Text style={[typography.caption, { color: colors.error, textAlign: "center" }]}>
                {`Insufficient balance. You need R ${parsed.toFixed(2)} but have ${balanceZar}.`}
              </Text>
            ) : null}
          </View>
        </Card>

        {error ? (
          <Card elevation="sm">
            <Text style={typography.body}>{error}</Text>
          </Card>
        ) : null}

        <AppButton
          disabled={!isValidAmount || insufficientBalance}
          label="Review payment"
          onPress={handleReview}
          size="lg"
        />
        <AppButton label="Cancel" onPress={() => router.back()} variant="secondary" />
      </View>
    </AppScreen>
  );
}
