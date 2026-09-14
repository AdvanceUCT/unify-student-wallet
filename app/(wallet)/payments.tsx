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
import { InboxHeaderButton } from "@/src/components/InboxHeaderButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { UnifiedActivityFeed } from "@/src/components/UnifiedActivityFeed";
import { formatZarMinor } from "@/src/features/payment/money";
import { getTopUp, getWalletActivity, getWalletBalance, type WalletActivity } from "@/src/features/payment/paymentApi";
import { loadPaymentSession } from "@/src/features/payment/paymentSession";
import { clearPendingTopUp, loadPendingTopUp, type PendingTopUp } from "@/src/features/payment/topUpSession";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { normalizeWalletActivity } from "@/src/features/wallet/unifiedActivity";
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
    data: activity = [] as WalletActivity[],
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ["wallet-activity"],
    queryFn: ({ signal }) => getWalletActivity(signal),
    enabled: paymentActivated,
  });

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([loadPaymentSession({ allowExpired: true }), loadPendingTopUp()])
      .then(async ([session, pending]) => {
        if (!active) return;
        const activated = Boolean(session);
        setPaymentActivated(activated);
        if (activated) {
          let nextPending = pending;
          if (pending) {
            try {
              const topUp = await getTopUp(pending.topUpId);
              if (!active) return;
              if (topUp.status === "SUCCEEDED" || topUp.status === "FAILED") {
                await clearPendingTopUp();
                nextPending = null;
              }
            } catch {
              if (!active) return;
            }
          }
          setPendingTopUp(nextPending);
          void refetchBalance();
          void refetchActivity();
        } else {
          setPendingTopUp(pending);
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
  const walletFeed = normalizeWalletActivity(activity);

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader eyebrow="Payments" title="Balance & activity" trailing={<InboxHeaderButton />} />

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
            <UnifiedActivityFeed compact items={walletFeed.slice(0, 6)} />
          )}
        </View>
      </View>
    </AppScreen>
  );
}
