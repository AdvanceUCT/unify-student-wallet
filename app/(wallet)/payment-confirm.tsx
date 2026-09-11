/**
 * @fileoverview Confirms an online student payment and safely handles uncertain outcomes.
 * @module app/(wallet)/payment-confirm
 */

import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { formatZarMinor } from "@/src/features/payment/money";
import { isPaymentOnline, usePaymentNetworkStatus } from "@/src/features/payment/network";
import { resolvePaymentDestination, submitPayment } from "@/src/features/payment/paymentApi";
import { paymentFailure, type PaymentFailure } from "@/src/features/payment/paymentErrors";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default function PaymentConfirmScreen() {
  const colors = useThemePalette();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    qrIdentifier?: string | string[];
    amountMinor?: string | string[];
    idempotencyKey?: string | string[];
  }>();
  const qrIdentifier = firstParam(params.qrIdentifier);
  const idempotencyKey = firstParam(params.idempotencyKey);
  const amountMinor = Number(firstParam(params.amountMinor));
  const validRequest = Number.isSafeInteger(amountMinor) && amountMinor > 0 && Boolean(idempotencyKey && qrIdentifier);
  const { isOffline } = usePaymentNetworkStatus();
  const [failure, setFailure] = useState<PaymentFailure>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const destinationQuery = useQuery({
    queryKey: ["payment-destination", qrIdentifier],
    queryFn: ({ signal }) => resolvePaymentDestination(qrIdentifier, signal),
    enabled: validRequest,
  });

  async function handlePayment() {
    if (submittingRef.current || !validRequest || !destinationQuery.data) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setFailure(undefined);

    if (!(await isPaymentOnline())) {
      setFailure({
        title: "You're offline",
        message: "Reconnect to the internet before trying this payment.",
        outcomeUnknown: false,
      });
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      const receipt = await submitPayment({ amountMinor, idempotencyKey, qrIdentifier });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wallet-balance"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-activity"] }),
      ]);
      router.replace({
        pathname: "/(wallet)/payment-result",
        params: {
          amountMinor: String(receipt.amountMinor),
          branchName: receipt.branchName,
          completedAt: receipt.completedAt,
          resultingBalanceMinor: String(receipt.resultingBalanceMinor),
          transactionId: receipt.transactionId,
          vendorName: receipt.vendorName,
        },
      });
    } catch (error) {
      setFailure(paymentFailure(error));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  const destinationFailure = destinationQuery.error ? paymentFailure(destinationQuery.error) : undefined;
  const activeFailure = failure ?? destinationFailure;

  return (
    <AppScreen
      footer={
        <View style={{ gap: spacing.sm }}>
          <AppButton
            disabled={!validRequest || !destinationQuery.data || isSubmitting || isOffline}
            label={isSubmitting ? "Processing…" : failure?.outcomeUnknown ? "Retry payment" : `Pay ${formatZarMinor(amountMinor)}`}
            onPress={() => void handlePayment()}
            size="lg"
          />
          <AppButton disabled={isSubmitting} label="Go back" onPress={() => router.back()} variant="secondary" />
        </View>
      }
    >
      <ScreenHeader eyebrow="Confirm payment" title={formatZarMinor(amountMinor)} meta="Check the destination before authorising this payment." />
      <View style={{ gap: spacing.lg }}>
        {isOffline ? (
          <View style={{ backgroundColor: colors.warningSoft, padding: spacing.lg }}>
            <Text accessibilityLiveRegion="assertive" style={[typography.bodyStrong, { color: colors.warning }]}>You are offline. Reconnect to enable payment.</Text>
          </View>
        ) : null}

        {destinationQuery.data ? (
          <View>
            <InfoRow divider label="Vendor" value={destinationQuery.data.vendorName} />
            <InfoRow divider label="Branch" value={destinationQuery.data.branchName} />
            <InfoRow label="Amount" value={formatZarMinor(amountMinor)} />
          </View>
        ) : destinationQuery.isLoading ? (
          <Text accessibilityLiveRegion="polite" style={typography.body}>Checking payment details…</Text>
        ) : null}

        {activeFailure ? (
          <View style={{ borderLeftColor: activeFailure.outcomeUnknown ? colors.warning : colors.error, borderLeftWidth: 3, paddingLeft: spacing.lg, gap: spacing.sm }}>
            <Text accessibilityLiveRegion="assertive" style={[typography.heading, { color: activeFailure.outcomeUnknown ? colors.warning : colors.error }]}>{activeFailure.title}</Text>
            <Text style={typography.body}>{activeFailure.message}</Text>
            {activeFailure.requestId ? <Text selectable style={typography.caption}>Reference: {activeFailure.requestId}</Text> : null}
          </View>
        ) : null}

        {!validRequest ? (
          <Text accessibilityLiveRegion="assertive" style={[typography.body, { color: colors.error }]}>These payment details are invalid. Return to the scanner and try again.</Text>
        ) : null}
      </View>
    </AppScreen>
  );
}
