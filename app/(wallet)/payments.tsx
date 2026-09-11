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
import { getWalletActivity, getWalletBalance } from "@/src/features/payment/paymentApi";
import { loadPaymentSession } from "@/src/features/payment/paymentSession";
import { loadPendingTopUp, type PendingTopUp } from "@/src/features/payment/topUpSession";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function PaymentsScreen() {
  const colors = useThemePalette();
  const [paymentActivated, setPaymentActivated] = useState(false);
  const [pendingTopUp, setPendingTopUp] = useState<PendingTopUp | null>(null);
  const {
    data: balance,
    isError: balanceError,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: ({ signal }) => getWalletBalance(signal),
    enabled: paymentActivated,
  });
  const {
    data: activity = [],
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ["wallet-activity"],
    queryFn: ({ signal }) => getWalletActivity(signal),
    enabled: paymentActivated,
  });

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([loadPaymentSession({ allowExpired: true }), loadPendingTopUp()])
      .then(([session, pending]) => {
        if (!active) return;
        const activated = Boolean(session);
        setPaymentActivated(activated);
        setPendingTopUp(pending);
        if (activated) {
          void refetchBalance();
          void refetchActivity();
        }
      })
      .catch(() => {
        if (!active) return;
        setPaymentActivated(false);
        setPendingTopUp(null);
    });
    return () => { active = false; };
  }, [refetchActivity, refetchBalance]));

  const balanceText = !paymentActivated
    ? "—"
    : balanceLoading
      ? "Loading…"
      : balance
        ? formatZarMinor(balance.postedBalanceMinor)
        : "—";
  const balanceMeta = !paymentActivated
    ? "Activate payments to top up and pay approved vendors."
    : balanceError
      ? "Could not refresh your balance. Return to this screen or try again later."
      : "Confirmed top-ups and payments update this balance.";

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
            <Text style={typography.display}>{balanceText}</Text>
            <Text style={typography.body}>{balanceMeta}</Text>
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
          {activity.length === 0 ? (
            <EmptyState
              icon={ReceiptIcon}
              eyebrow="No activity"
              body={paymentActivated ? "Top-ups and vendor payments will appear here once confirmed." : "Activate payments to view wallet activity."}
              action={
                <AppButton label="Scan service QR" onPress={() => router.push("/(wallet)/scan")} />
              }
            />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {activity.map((item) => (
                <Card key={item.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                    <View style={{ flex: 1, gap: spacing.xs }}>
                      <Text style={typography.eyebrow}>{item.status}</Text>
                      <Text style={typography.bodyStrong}>{item.title}</Text>
                      {item.subtitle ? <Text style={typography.caption}>{item.subtitle}</Text> : null}
                    </View>
                    <Text style={typography.monoLg}>
                      {item.direction === "CREDIT" ? "+" : "-"}{formatZarMinor(item.amountMinor)}
                    </Text>
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
