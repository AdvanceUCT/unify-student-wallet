/**
 * @fileoverview Starts a hosted Paystack wallet top-up without trusting browser return success.
 * @module app/(wallet)/topup-amount
 */

import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppTextField } from "@/src/components/AppTextField";
import { Card } from "@/src/components/Card";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { formatZarMinor, parseZarAmount } from "@/src/features/payment/money";
import { isPaymentOnline, usePaymentNetworkStatus } from "@/src/features/payment/network";
import {
  createTopUp,
  MAX_TOP_UP_MINOR,
  MIN_TOP_UP_MINOR,
} from "@/src/features/payment/paymentApi";
import { paymentFailure } from "@/src/features/payment/paymentErrors";
import { loadPendingTopUp, savePendingTopUp } from "@/src/features/payment/topUpSession";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const QUICK_AMOUNTS = [1_000, 5_000, 10_000] as const;
const TOP_UP_RETURN_URL = "unifywallet://topup-return";

export default function TopUpAmountScreen() {
  const colors = useThemePalette();
  const { isOffline } = usePaymentNetworkStatus();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startTopUp() {
    const existing = await loadPendingTopUp();
    if (existing) {
      router.replace({
        pathname: "/(wallet)/topup-result",
        params: { topUpId: existing.topUpId },
      });
      return;
    }

    const parsed = parseZarAmount(amount, {
      minMinor: MIN_TOP_UP_MINOR,
      maxMinor: MAX_TOP_UP_MINOR,
    });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    setBusy(true);
    setError(null);
    if (!(await isPaymentOnline())) {
      setError("Reconnect before starting a top-up. No top-up was created.");
      setBusy(false);
      return;
    }

    try {
      const idempotencyKey = Crypto.randomUUID();
      const topUp = await createTopUp({
        amountMinor: parsed.amountMinor,
        currency: "ZAR",
        idempotencyKey,
      });

      await savePendingTopUp({
        amountMinor: topUp.amountMinor,
        authorizationUrl: topUp.status === "PENDING" ? topUp.authorizationUrl : "",
        createdAt: new Date().toISOString(),
        currency: topUp.currency,
        idempotencyKey,
        reference: topUp.reference,
        status: topUp.status,
        topUpId: topUp.topUpId,
      });

      if (topUp.status === "PENDING") {
        await WebBrowser.openAuthSessionAsync(topUp.authorizationUrl, `${TOP_UP_RETURN_URL}?topUpId=${encodeURIComponent(topUp.topUpId)}`);
      }
      router.replace({
        pathname: "/(wallet)/topup-result",
        params: { topUpId: topUp.topUpId, returned: topUp.status === "PENDING" ? "1" : "0" },
      });
    } catch (caught) {
      const failure = paymentFailure(caught);
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppScreen
      footer={
        <View style={{ gap: spacing.sm }}>
          <AppButton
            disabled={busy || isOffline}
            label={busy ? "Opening checkout..." : "Top up"}
            onPress={() => void startTopUp()}
            size="lg"
          />
          <AppButton disabled={busy} label="Cancel" onPress={() => router.replace("/(wallet)/payments")} variant="secondary" />
        </View>
      }
    >
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          eyebrow="Wallet top-up"
          title="Choose amount"
          meta="Paystack checkout opens in your browser. UNIFY credits only after server confirmation."
        />

        {isOffline ? (
          <Card elevation="sm">
            <Text accessibilityLiveRegion="assertive" style={[typography.bodyStrong, { color: colors.warning }]}>
              You are offline. Reconnect before starting a top-up.
            </Text>
          </Card>
        ) : null}

        <Card elevation="md">
          <View style={{ gap: spacing.lg }}>
            <AppTextField
              accessibilityHint="Enter a rand amount from R10 to R5000 with up to two decimal places"
              error={error ?? undefined}
              keyboardType="decimal-pad"
              label="Amount (ZAR)"
              onChangeText={(value) => {
                setAmount(value);
                setError(null);
              }}
              placeholder="0.00"
              returnKeyType="done"
              value={amount}
            />

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {QUICK_AMOUNTS.map((amountMinor) => (
                <Pressable
                  key={amountMinor}
                  accessibilityRole="button"
                  onPress={() => {
                    setAmount(String(amountMinor / 100));
                    setError(null);
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.rule,
                    borderRadius: radii.sm,
                    borderWidth: 1,
                    flex: 1,
                    opacity: pressed ? 0.72 : 1,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.md,
                  })}
                >
                  <Text style={[typography.label, { textAlign: "center" }]}>{formatZarMinor(amountMinor)}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={typography.caption}>
              Minimum {formatZarMinor(MIN_TOP_UP_MINOR)}. Maximum {formatZarMinor(MAX_TOP_UP_MINOR)}.
            </Text>
          </View>
        </Card>
      </View>
    </AppScreen>
  );
}
