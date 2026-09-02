/**
 * @fileoverview Collects a top-up amount before starting the Paystack checkout.
 * @module app/(wallet)/topup-amount
 */

import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { initiateTopUp } from "@/src/features/payment/paymentApi";
import { useWallet } from "@/src/features/payment/useWallet";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const QUICK_AMOUNTS = ["50", "100", "200", "500"];

export default function TopUpAmountScreen() {
  const colors = useThemePalette();
  const { balanceZar, hasCredential } = useWallet();
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasCredential) router.replace("/(wallet)/payment-wallet");
  }, [hasCredential]);

  const parsed = parseFloat(amount);
  const isValidAmount = Number.isFinite(parsed) && parsed > 0;
  const belowMinimum = isValidAmount && parsed < 1;
  const aboveMaximum = isValidAmount && parsed > 5000;

  async function handleTopUp() {
    const amountCents = Math.round(parsed * 100);
    if (amountCents < 100) {
      setError("Minimum top-up is R1.00");
      return;
    }
    if (amountCents > 500000) {
      setError("Maximum top-up is R5,000.00");
      return;
    }

    setIsLoading(true);
    const result = await initiateTopUp(amountCents);
    setIsLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push({
      pathname: "/(wallet)/topup-checkout",
      params: {
        checkoutUrl: encodeURIComponent(result.data.checkoutUrl),
        transactionId: result.data.transactionId,
        amountCents: String(amountCents),
      },
    });
  }

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader eyebrow="Top up" title="Add funds" meta={`Current balance: ${balanceZar}`} />

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {QUICK_AMOUNTS.map((value) => {
            const selected = amount === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                onPress={() => { setAmount(value); setError(null); }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: spacing.md,
                  borderRadius: radii.md,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.primary : colors.rule,
                  backgroundColor: selected ? colors.primarySoft : colors.surface,
                }}
              >
                <Text style={[typography.bodyStrong, { color: selected ? colors.primary : colors.ink }]}>{`R${value}`}</Text>
              </Pressable>
            );
          })}
        </View>

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
            {belowMinimum ? (
              <Text style={[typography.caption, { color: colors.error, textAlign: "center" }]}>Minimum top-up is R1.00</Text>
            ) : null}
            {aboveMaximum ? (
              <Text style={[typography.caption, { color: colors.error, textAlign: "center" }]}>Maximum top-up is R5,000</Text>
            ) : null}
          </View>
        </Card>

        {error ? (
          <Card elevation="sm">
            <Text style={typography.body}>{error}</Text>
          </Card>
        ) : null}

        <AppButton
          disabled={!isValidAmount || belowMinimum || aboveMaximum || isLoading}
          label={isLoading ? "Preparing..." : `Top up R${Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00"}`}
          onPress={() => void handleTopUp()}
          size="lg"
        />
        <AppButton label="Cancel" onPress={() => router.back()} variant="secondary" />
      </View>
    </AppScreen>
  );
}
