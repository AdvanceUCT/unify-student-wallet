/**
 * @fileoverview Resolves a scanned payment QR and collects a ZAR amount.
 * @module app/(wallet)/payment-amount
 */

import * as Crypto from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppTextField } from "@/src/components/AppTextField";
import { Card } from "@/src/components/Card";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { parseZarAmount } from "@/src/features/payment/money";
import { resolvePaymentDestination } from "@/src/features/payment/paymentApi";
import { paymentFailure } from "@/src/features/payment/paymentErrors";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default function PaymentAmountScreen() {
  const colors = useThemePalette();
  const params = useLocalSearchParams<{ qrIdentifier?: string | string[] }>();
  const qrIdentifier = firstParam(params.qrIdentifier);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string>();
  const navigatingRef = useRef(false);
  const destinationQuery = useQuery({
    queryKey: ["payment-destination", qrIdentifier],
    queryFn: ({ signal }) => resolvePaymentDestination(qrIdentifier, signal),
    enabled: Boolean(qrIdentifier),
  });

  const loadFailure = destinationQuery.error ? paymentFailure(destinationQuery.error) : undefined;

  function continueToConfirmation() {
    if (navigatingRef.current || !destinationQuery.data) return;
    const parsed = parseZarAmount(amount);
    if (!parsed.ok) {
      setAmountError(parsed.error);
      return;
    }

    navigatingRef.current = true;
    router.push({
      pathname: "/(wallet)/payment-confirm",
      params: {
        amountMinor: String(parsed.amountMinor),
        idempotencyKey: Crypto.randomUUID(),
        qrIdentifier,
      },
    });
  }

  return (
    <AppScreen
      footer={
        <View style={{ gap: spacing.sm }}>
          <AppButton
            disabled={!destinationQuery.data || destinationQuery.isLoading}
            label="Review payment"
            onPress={continueToConfirmation}
            size="lg"
          />
          <AppButton label="Cancel" onPress={() => router.replace("/(wallet)/home")} variant="secondary" />
        </View>
      }
    >
      <ScreenHeader eyebrow="Wallet payment" title="Enter amount" meta="The vendor and amount will be shown again before you pay." />
      <View style={{ gap: spacing.xl }}>
        {destinationQuery.isLoading ? (
          <Text accessibilityLiveRegion="polite" style={typography.bodyLg}>Checking this payment QR…</Text>
        ) : loadFailure ? (
          <Card elevation="sm">
            <View style={{ gap: spacing.md }}>
              <Text accessibilityLiveRegion="assertive" style={[typography.heading, { color: colors.error }]}>{loadFailure.title}</Text>
              <Text style={typography.body}>{loadFailure.message}</Text>
              {loadFailure.requestId ? <Text selectable style={typography.caption}>Reference: {loadFailure.requestId}</Text> : null}
              <AppButton label="Try again" onPress={() => void destinationQuery.refetch()} variant="secondary" />
            </View>
          </Card>
        ) : destinationQuery.data ? (
          <View style={{ gap: spacing.lg }}>
            <Card eyebrow="Paying to" heading={destinationQuery.data.vendorName} elevation="md">
              <InfoRow label="Branch" value={destinationQuery.data.branchName} />
              <InfoRow label="Currency" value={destinationQuery.data.currency} />
            </Card>
            <AppTextField
              accessibilityHint="Enter a rand amount with up to two decimal places"
              error={amountError}
              keyboardType="decimal-pad"
              label="Amount (ZAR)"
              onChangeText={(value) => { setAmount(value); setAmountError(undefined); }}
              placeholder="0.00"
              returnKeyType="done"
              value={amount}
            />
          </View>
        ) : (
          <Text accessibilityLiveRegion="assertive" style={[typography.body, { color: colors.error }]}>This payment QR is invalid.</Text>
        )}
      </View>
    </AppScreen>
  );
}
