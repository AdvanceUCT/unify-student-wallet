import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { AppScreen } from "@/src/components/AppScreen";
import { AppButton } from "@/src/components/AppButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { InfoRow } from "@/src/components/InfoRow";
import { formatZarMinor } from "@/src/features/payment/money";
import { resolvePaymentRequest, payRequest, getPaymentRequestReceipt, type PosPaymentReceipt } from "@/src/features/payment/paymentRequestApi";
import { loadPendingPaymentRequest, savePendingPaymentRequest } from "@/src/features/payment/paymentRequestSession";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { loadPaymentSession } from "@/src/features/payment/paymentSession";
import { isPaymentOnline, usePaymentNetworkStatus } from "@/src/features/payment/network";
import { ApiClientError } from "@/src/lib/api/apiClient";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function PaymentRequestScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { setPendingPaymentRequest } = useWalletSession();
  const queryClient = useQueryClient();
  const { isOffline } = usePaymentNetworkStatus();
  const [ready, setReady] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<PosPaymentReceipt>();
  const [now, setNow] = useState(Date.now());
  const guard = useRef(false);
  const query = useQuery({ queryKey: ["pos-payment-request", id], queryFn: ({ signal }) => resolvePaymentRequest(id, signal), enabled: ready && /^[A-Za-z0-9_-]{32}$/.test(id), retry: false });
  useEffect(() => {
    void setPendingPaymentRequest(id).then(() => loadPaymentSession()).then((session) => {
      void loadPendingPaymentRequest().then((pending) => setSubmitted(Boolean(pending?.submitted)));
      if (!session) router.replace("/(wallet)/payment-activate"); else setReady(true);
    }).catch((error) => setMessage(error.message));
    const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer);
  }, [id, setPendingPaymentRequest]);
  async function recover() {
    if (guard.current) return;
    guard.current = true; setBusy(true); setMessage("");
    try {
      const status = await resolvePaymentRequest(id);
      if (status.status === "PAID") {
        const result = await getPaymentRequestReceipt(id); setReceipt(result);
        await setPendingPaymentRequest();
        await Promise.all([queryClient.invalidateQueries({ queryKey: ["wallet-balance"] }), queryClient.invalidateQueries({ queryKey: ["wallet-activity"] })]);
      } else {
        await query.refetch();
        setMessage(status.status === "PENDING" ? "This sale is still unpaid. Review it before approving." : `This sale is ${status.status.toLowerCase()}.`);
      }
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 401 || error.code === "PAYMENT_SESSION_REQUIRED")) router.replace("/(wallet)/payment-activate");
      else setMessage(error instanceof Error ? error.message : "Could not recover the result. Reconnect and check again.");
    } finally { guard.current = false; setBusy(false); }
  }
  useEffect(() => {
    if (ready) void loadPendingPaymentRequest().then((pending) => { if (pending?.submitted) void recover(); });
    // Recover once on entry; approval never runs from an effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  useEffect(() => { if (query.error instanceof ApiClientError && (query.error.status === 401 || query.error.code === "PAYMENT_SESSION_REQUIRED")) router.replace("/(wallet)/payment-activate"); }, [query.error]);
  async function approve() {
    if (guard.current || !query.data || query.data.status !== "PENDING") return;
    guard.current = true; setBusy(true); setMessage("");
    try {
      if (!await isPaymentOnline()) throw new Error("Reconnect before approving payment.");
      const pending = await loadPendingPaymentRequest();
      if (!pending || pending.id !== id) throw new Error("Payment reference was not saved. Reopen this request.");
      const latest = await resolvePaymentRequest(id);
      if (latest.status === "PAID") {
        setReceipt(await getPaymentRequestReceipt(id));
      } else {
        if (latest.status !== "PENDING") throw new Error(`This sale is ${latest.status.toLowerCase()}.`);
        await savePendingPaymentRequest({ ...pending, submitted: true });
        setSubmitted(true);
        setReceipt(await payRequest(id, pending.idempotencyKey));
      }
      await setPendingPaymentRequest();
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["wallet-balance"] }), queryClient.invalidateQueries({ queryKey: ["wallet-activity"] })]);
    } catch (error) {
      if (error instanceof ApiClientError && ["INSUFFICIENT_FUNDS", "ACCOUNT_SUSPENDED", "BRANCH_NOT_PAYMENT_ENABLED", "PAYMENT_WALLET_DISABLED"].includes(error.code ?? "")) {
        const pending = await loadPendingPaymentRequest();
        if (pending?.id === id) await savePendingPaymentRequest({ ...pending, submitted: false });
        setSubmitted(false);
      }
      setMessage(`${error instanceof Error ? error.message : "Payment result is unknown."} Check the result before trying again.`);
    }
    finally { guard.current = false; setBusy(false); }
  }
  const data = receipt ?? query.data;
  const seconds = data ? Math.max(0, Math.ceil((Date.parse(data.expiresAt) - now) / 1000)) : 0;
  return <AppScreen footer={<View style={{ gap: spacing.sm }}>
    {receipt ? <AppButton label="Done" onPress={() => router.replace("/(wallet)/payments")} /> : <>
      <AppButton label={busy ? "Checking payment…" : `Pay ${data ? formatZarMinor(data.amountMinor) : ""}`} disabled={busy || isOffline || !query.data || query.data.status !== "PENDING" || seconds === 0} onPress={() => void approve()} />
      <AppButton label="Top up wallet" disabled={busy} onPress={() => router.push("/(wallet)/topup-amount")} variant="secondary" />
      <AppButton label="Check payment result" disabled={busy || isOffline} onPress={() => void recover()} variant="secondary" />
      <AppButton label="Leave checkout" disabled={busy || submitted && (!query.data || query.data.status === "PENDING")} onPress={() => void setPendingPaymentRequest().then(() => router.replace("/(wallet)/payments"))} variant="secondary" />
    </>}
  </View>}>
    <ScreenHeader eyebrow="UNIFY checkout" title={receipt ? "Payment confirmed" : data ? formatZarMinor(data.amountMinor) : "Loading sale"} meta="The amount is fixed by the vendor. Review before approving." />
    {data && <View><InfoRow divider label="Vendor" value={data.vendorName} /><InfoRow divider label="Branch" value={data.branchName} /><InfoRow divider label="Order" value={data.orderReference} /><InfoRow divider label="Amount" value={formatZarMinor(data.amountMinor)} /><InfoRow label="State" value={receipt ? "Paid" : `${query.data?.status} · ${seconds}s remaining`} /></View>}
    {receipt && <View><InfoRow divider label="Transaction" value={receipt.transactionId} /><InfoRow divider label="Completed" value={new Date(receipt.completedAt).toLocaleString()} /><InfoRow label="Wallet balance" value={formatZarMinor(receipt.resultingBalanceMinor)} /></View>}
    <Text accessibilityLiveRegion="polite" style={typography.body}>{message || (query.error instanceof Error ? query.error.message : "")}</Text>
  </AppScreen>;
}
