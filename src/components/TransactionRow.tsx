/**
 * @fileoverview Renders a single wallet transaction with type icon, description, and signed amount.
 * @module components/TransactionRow
 */

import { ArrowDownLeft, ArrowUpRight } from "lucide-react-native";
import { Text, View } from "react-native";

import { StatusPill } from "@/src/components/StatusPill";
import { formatDateTime } from "@/src/features/wallet/credentialDisplay";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import type { WalletTransaction } from "@/src/features/payment/paymentApi";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const TYPE_LABELS: Record<string, string> = {
  TOPUP: "Top up",
  PAYMENT: "Payment",
  REFUND: "Refund",
  PAYOUT: "Payout",
};

function typeLabel(type: string) {
  return TYPE_LABELS[type] ?? type.charAt(0) + type.slice(1).toLowerCase();
}

function amountZar(amountCents: number) {
  return `R ${(amountCents / 100).toFixed(2)}`;
}

export function TransactionRow({ transaction }: { transaction: WalletTransaction }) {
  const colors = useThemePalette();
  const isCredit = transaction.type === "TOPUP" || transaction.type === "REFUND";
  const iconColor = transaction.type === "TOPUP" ? colors.success
    : transaction.type === "REFUND" ? colors.focus
    : transaction.type === "PAYMENT" ? colors.error
    : colors.inkSubtle;
  const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;

  const statusLabel = transaction.status === "PENDING"
    ? (transaction.type === "REFUND" ? "Processing" : "Pending")
    : transaction.status === "FAILED"
      ? "Failed"
      : null;
  const statusTone = transaction.status === "FAILED" ? "error" : "warning";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md }}>
      <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
        <Icon color={iconColor} size={19} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={typography.bodyStrong}>{typeLabel(transaction.type)}</Text>
        {transaction.description ? <Text numberOfLines={1} style={typography.caption}>{transaction.description}</Text> : null}
        <Text numberOfLines={1} style={typography.caption}>{formatDateTime(transaction.createdAt)}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
        <Text style={[typography.bodyStrong, { color: isCredit ? colors.success : colors.error }]}>
          {isCredit ? "+" : "-"}
          {amountZar(transaction.amountCents)}
        </Text>
        {statusLabel ? <StatusPill label={statusLabel} tone={statusTone} /> : null}
      </View>
    </View>
  );
}
