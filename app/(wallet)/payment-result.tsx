import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { getPaymentReceipt } from "@/src/features/payment/paymentApi";
import { formatZarMinor } from "@/src/features/payment/money";
import { ApiClientError } from "@/src/lib/api/apiClient";
import { spacing } from "@/src/theme/spacing";
import { paymentQueryKey } from "@/src/features/payment/paymentScope";
import { usePaymentScope } from "@/src/features/payment/usePaymentScope";
export default function PaymentResultScreen() {
  const scope = usePaymentScope();
  const { transactionId } = useLocalSearchParams<{ transactionId?: string }>();
  const query = useQuery({ queryKey: [...paymentQueryKey("receipt", scope), transactionId], queryFn: ({ signal }) => getPaymentReceipt(transactionId ?? "", signal), enabled: Boolean(transactionId) && scope.hydrated && Boolean(scope.sessionId), retry: false });
  useEffect(() => { if (query.error instanceof ApiClientError && query.error.status === 401) router.replace("/(wallet)/payment-activate"); }, [query.error]);
  const receipt = query.data;
  return <AppScreen footer={<AppButton label="Done" onPress={() => router.replace("/(wallet)/payments")} />}>
    <ScreenHeader eyebrow="Payment receipt" title={receipt ? "Paid" : "Checking receipt"} meta={receipt ? `${receipt.vendorName} · ${receipt.branchName}` : "Receipts are retrieved securely from UNIFY."} />
    {receipt ? <View style={{ gap: spacing.sm }}><InfoRow divider label="Amount" value={formatZarMinor(receipt.amountMinor)} /><InfoRow divider label="Wallet balance" value={formatZarMinor(receipt.resultingBalanceMinor)} />{receipt.orderReference && <InfoRow divider label="Order" value={receipt.orderReference} />}<InfoRow divider label="Time" value={new Date(receipt.completedAt).toLocaleString()} /><InfoRow label="Reference" value={receipt.transactionId} /></View> : <View><Text accessibilityLiveRegion="polite">{query.error instanceof Error ? query.error.message : "Loading your payment receipt…"}</Text><AppButton label="Refresh receipt" onPress={() => void query.refetch()} variant="secondary" /></View>}
  </AppScreen>;
}
