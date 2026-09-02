/**
 * @fileoverview Displays the campus payment wallet balance, status, and recent transactions.
 * @module app/(wallet)/payment-wallet
 */

import { router } from "expo-router";
import { RefreshCw, Wallet as WalletIcon } from "lucide-react-native";
import { ActivityIndicator, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { IconButton } from "@/src/components/IconButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatusPill } from "@/src/components/StatusPill";
import { TransactionRow } from "@/src/components/TransactionRow";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { useWallet } from "@/src/features/payment/useWallet";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function PaymentWalletScreen() {
  const colors = useThemePalette();
  const {
    balanceZar,
    isActive,
    transactions,
    isLoading,
    isInitializing,
    hasCredential,
    refresh,
    error,
  } = useWallet();

  if (isInitializing) {
    return (
      <AppScreen>
        <ScreenHeader eyebrow="Wallet" title="Campus wallet" />
        <View style={{ alignItems: "center", paddingVertical: spacing["3xl"], gap: spacing.md }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={typography.body}>Setting up your wallet...</Text>
        </View>
      </AppScreen>
    );
  }

  const statusLabel = isActive ? "Active" : hasCredential ? "Activating" : "Inactive";
  const statusTone = isActive ? "success" : hasCredential ? "warning" : "ink";
  const recentTransactions = transactions.slice(0, 5);

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader eyebrow="Wallet" title="Campus wallet" />

        {!hasCredential ? (
          <Card elevation="sm">
            <View style={{ alignItems: "center", gap: spacing.sm }}>
              <WalletIcon color={colors.inkSubtle} size={28} strokeWidth={1.6} />
              <Text style={[typography.heading, { textAlign: "center" }]}>Wallet not yet active</Text>
              <Text style={[typography.body, { textAlign: "center" }]}>
                Your payment wallet activates automatically when you accept your UCT student credential. Check your
                email for an activation link to get started.
              </Text>
              <View style={{ marginTop: spacing.sm, alignSelf: "stretch" }}>
                <AppButton label="Activate credential" onPress={() => router.push("/(wallet)/scan")} variant="secondary" />
              </View>
            </View>
          </Card>
        ) : null}

        <Card elevation="md">
          <View style={{ alignItems: "center", gap: spacing.xs }}>
            <StatusPill label={statusLabel} tone={statusTone} />
            <Text style={typography.display}>{balanceZar}</Text>
            <Text style={typography.body}>Available balance</Text>
          </View>

          <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
            <View style={{ flex: 1 }}>
              <AppButton
                disabled={!hasCredential}
                label="Top up"
                onPress={() => router.push("/(wallet)/topup-amount")}
                variant="primary"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                disabled={!hasCredential || !isActive}
                label="Scan to pay"
                onPress={() => router.push("/(wallet)/scan")}
                variant="secondary"
              />
            </View>
          </View>
        </Card>

        {error ? (
          <Card elevation="sm">
            <View style={{ gap: spacing.md }}>
              <Text style={typography.body}>{error}</Text>
              <AppButton label="Try again" onPress={() => void refresh()} />
            </View>
          </Card>
        ) : null}

        <Card
          heading="Recent transactions"
          trailing={<IconButton accessibilityLabel="Refresh transactions" icon={RefreshCw} onPress={() => void refresh()} />}
        >
          {isLoading && recentTransactions.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : recentTransactions.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: spacing.xl, gap: spacing.xs }}>
              <Text style={typography.bodyStrong}>No transactions yet</Text>
              <Text style={typography.caption}>Top up your wallet to get started</Text>
            </View>
          ) : (
            <View>
              {recentTransactions.map((transaction, index) => (
                <View
                  key={transaction.id}
                  style={{ borderTopWidth: index === 0 ? 0 : 1, borderColor: colors.ruleSoft }}
                >
                  <TransactionRow transaction={transaction} />
                </View>
              ))}
            </View>
          )}

          {transactions.length > 5 ? (
            <View style={{ marginTop: spacing.md }}>
              <AppButton label="View all transactions" onPress={() => router.push("/(wallet)/transactions")} variant="secondary" />
            </View>
          ) : null}
        </Card>
      </View>
    </AppScreen>
  );
}
