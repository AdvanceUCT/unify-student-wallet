/**
 * @fileoverview Displays the student's Ethereum campus payment wallet, balance, and address.
 * @module app/(wallet)/payment-wallet
 */

import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Copy } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Tag } from "@/src/components/Tag";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { usePaymentWallet } from "@/src/features/payment/usePaymentWallet";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function PaymentWalletScreen() {
  const colors = useThemePalette();
  const { address, balanceEth, balanceZar, isVerified, isLoading, error, refresh } = usePaymentWallet();
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AppScreen>
      <ScreenHeader eyebrow="PAYMENT" title="Your campus wallet" />

      {isLoading ? (
        <View style={{ paddingVertical: spacing["3xl"], alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <Card style={{ borderColor: colors.error, gap: spacing.md }}>
          <Text style={[typography.bodyStrong, { color: colors.error }]}>{error}</Text>
          <AppButton label="Try again" onPress={() => void refresh()} />
        </Card>
      ) : (
        <View style={{ gap: spacing.xl }}>
          <Card style={{ backgroundColor: colors.primary, borderWidth: 0 }} elevation="md">
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={[typography.eyebrow, { color: colors.white }]}>Balance</Text>
                <Tag label={isVerified ? "UCT Verified" : "Not verified"} tone={isVerified ? "success" : "warning"} />
              </View>
              <Text style={[typography.display, { color: colors.white }]}>{balanceZar ?? "R 0.00"}</Text>
              <Text style={[typography.body, { color: colors.white, opacity: 0.85 }]}>
                {balanceEth ?? "0"} ETH · Sepolia
              </Text>
            </View>
          </Card>

          <Card>
            <View style={{ gap: spacing.sm }}>
              <Text style={typography.eyebrow}>Wallet address</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
                <Text selectable style={typography.mono}>{address ? truncateAddress(address) : "—"}</Text>
                <AppButton
                  icon={Copy}
                  label={copied ? "Copied" : "Copy"}
                  onPress={() => void copyAddress()}
                  variant="outline"
                />
              </View>
            </View>
          </Card>

          <Card
            eyebrow="Top up your wallet"
            trailing={<Tag label="Coming soon" tone="muted" />}
          >
            <Text style={typography.body}>
              Add funds to pay at campus service points. Top-up via the Unify admin portal or ask your campus
              finance office.
            </Text>
          </Card>

          <Card heading="Recent activity">
            <Text style={typography.body}>
              Transaction history will appear here after your first payment at a campus service point.
            </Text>
          </Card>
        </View>
      )}
    </AppScreen>
  );
}
