/**
 * @fileoverview Shows the outcome of a Paystack top-up attempt.
 * @module app/(wallet)/topup-result
 */

import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle, XCircle } from "lucide-react-native";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { useWallet } from "@/src/features/payment/useWallet";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function TopUpResultScreen() {
  const colors = useThemePalette();
  const { status, amountCents } = useLocalSearchParams<{ status: string; amountCents: string }>();
  const { refresh } = useWallet();
  const amountZar = `R ${(parseInt(amountCents ?? "0", 10) / 100).toFixed(2)}`;
  const succeeded = status === "success";

  useEffect(() => {
    if (succeeded) void refresh();
  }, [succeeded, refresh]);

  if (succeeded) {
    return (
      <AppScreen>
        <View style={{ gap: spacing.xl, alignItems: "center" }}>
          <CheckCircle color={colors.success} size={56} />
          <ScreenHeader eyebrow="Top up" title="Funds added." meta={`${amountZar} is being added to your wallet`} />
          <Card>
            <View style={{ gap: spacing.sm }}>
              <Text style={typography.body}>Your payment is being processed. Your balance will update shortly.</Text>
              <Text style={typography.caption}>If your balance does not update within a minute pull to refresh on your wallet.</Text>
            </View>
          </Card>
          <AppButton label="Go to wallet" onPress={() => router.replace("/(wallet)/payment-wallet")} size="lg" />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl, alignItems: "center" }}>
        <XCircle color={colors.error} size={56} />
        <ScreenHeader eyebrow="Top up failed" title="Payment not processed." />
        <Card>
          <View style={{ gap: spacing.sm }}>
            <Text style={typography.body}>Your payment could not be completed. No money was taken from your account.</Text>
            <Text style={typography.caption}>Please check your card details and try again.</Text>
          </View>
        </Card>
        <AppButton label="Try again" onPress={() => router.back()} size="lg" />
        <AppButton label="Go to wallet" onPress={() => router.replace("/(wallet)/payment-wallet")} variant="secondary" />
      </View>
    </AppScreen>
  );
}
