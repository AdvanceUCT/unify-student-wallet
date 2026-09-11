/**
 * @fileoverview Provides the proof-of-concept payments placeholder within the wallet shell.
 * @module app/(wallet)/payments
 */

import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { CreditCard, Wallet as WalletIcon, Receipt as ReceiptIcon } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { formatZarMinor } from "@/src/features/payment/money";
import { loadPaymentSession } from "@/src/features/payment/paymentSession";
import { loadPendingTopUp, type PendingTopUp } from "@/src/features/payment/topUpSession";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { getPaymentHistory } from "@/src/lib/api/client";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function PaymentsScreen() {
  const colors = useThemePalette();
  const [paymentActivated, setPaymentActivated] = useState(false);
  const [pendingTopUp, setPendingTopUp] = useState<PendingTopUp | null>(null);
  // Payments are still a backend placeholder, but this keeps the screen ready to wire.
  const paymentsQuery = useQuery({
    queryKey: ["payment-history"],
    queryFn: getPaymentHistory,
  });

  const payments = paymentsQuery.data ?? [];

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([loadPaymentSession({ allowExpired: true }), loadPendingTopUp()])
      .then(([session, pending]) => {
        if (!active) return;
        setPaymentActivated(Boolean(session));
        setPendingTopUp(pending);
      })
      .catch(() => {
        if (!active) return;
        setPaymentActivated(false);
        setPendingTopUp(null);
      });
    return () => { active = false; };
  }, []));

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader eyebrow="Payments" title="Balance & activity." />

        <Card elevation="md">
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <WalletIcon color={colors.primary} size={18} strokeWidth={1.6} />
              <Text style={typography.eyebrow}>Balance</Text>
            </View>
            <Text style={typography.display}>—</Text>
            <Text style={typography.body}>
              Balance appears only after the server confirms top-ups and payments.
            </Text>
            <View style={{ gap: spacing.sm }}>
              {pendingTopUp ? (
                <AppButton
                  icon={CreditCard}
                  label={`Resume ${formatZarMinor(pendingTopUp.amountMinor)} top-up`}
                  onPress={() => router.push({
                    pathname: "/(wallet)/topup-result",
                    params: { topUpId: pendingTopUp.topUpId },
                  })}
                />
              ) : paymentActivated ? (
                <AppButton icon={CreditCard} label="Top up" onPress={() => router.push("/(wallet)/topup-amount")} />
              ) : (
                <AppButton icon={CreditCard} label="Activate payments" onPress={() => router.push("/(wallet)/payment-activate")} />
              )}
              <Text style={typography.caption}>
                Payment activation uses your student number and a one-time code, separate from credential proof sharing.
              </Text>
            </View>
          </View>
        </Card>

        <View style={{ gap: spacing.md }}>
          <Text style={typography.heading}>Recent activity</Text>
          {payments.length === 0 ? (
            <EmptyState
              icon={ReceiptIcon}
              eyebrow="No activity"
              body="Payment and verification events will appear here once your wallet has been used at a service point."
              action={
                <AppButton label="Scan service QR" onPress={() => router.push("/(wallet)/scan")} />
              }
            />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {payments.map((payment) => (
                <Card key={payment.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <Text style={typography.eyebrow}>{payment.status}</Text>
                      <Text style={typography.bodyStrong}>{payment.vendor}</Text>
                    </View>
                    <Text style={typography.monoLg}>{payment.amount}</Text>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </View>
    </AppScreen>
  );
}
