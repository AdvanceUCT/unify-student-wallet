import { router, useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";
import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { OperationStateScreen } from "@/src/components/OperationStateScreen";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { ApiClientError } from "@/src/lib/api/apiClient";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";
import { CheckoutController, type CheckoutState } from "./checkoutController";
import { selectPosCheckout, selectStaticCheckout } from "./checkoutSession";
import { loadPaymentSession } from "./paymentSession";
import { formatZarMinor } from "./money";
import { isPaymentOnline, usePaymentNetworkStatus } from "./network";

export function CheckoutScreen({ input }: { input: { kind: "POS"; id: string } | { kind: "STATIC"; qrIdentifier: string; amountMinor: number; idempotencyKey: string } }) {
  const [state, setState] = useState<CheckoutState>({ phase: "CHECKING" });
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const mounted = useRef(true);
  const controllerRef = useRef<CheckoutController | null>(null);
  if (!controllerRef.current) controllerRef.current = new CheckoutController((next) => { if (mounted.current) setState(next); });
  const controller = controllerRef.current;
  const { refreshPendingCheckout } = useWalletSession();
  const queryClient = useQueryClient();
  const { isOffline } = usePaymentNetworkStatus();
  const inputKey = input.kind === "POS" ? input.id : `${input.idempotencyKey}:${input.qrIdentifier}:${input.amountMinor}`;
  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiClientError && (error.status === 401 || error.code === "PAYMENT_SESSION_REQUIRED")) router.replace("/(wallet)/payment-activate");
  }, []);
  useEffect(() => {
    mounted.current = true;
    void (async () => {
      try {
        if (input.kind === "POS") await selectPosCheckout(input.id); else await selectStaticCheckout(input);
        await refreshPendingCheckout();
        if (!await loadPaymentSession()) { router.replace("/(wallet)/payment-activate"); return; }
        setReady(true);
      } catch (error) { setState({ phase: "BLOCKED", message: error instanceof Error ? error.message : "Unable to load saved checkout." }); }
    })();
    return () => { mounted.current = false; };
    // The immutable navigation reference is the dependency; rerenders must not create a new checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey, refreshPendingCheckout]);
  const recover = useCallback(() => { if (ready && !isOffline) void controller.recover().catch(handleError); }, [controller, handleError, isOffline, ready]);
  useFocusEffect(useCallback(() => { recover(); }, [recover]));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") recover(); });
    return () => subscription.remove();
  }, [recover]);
  useEffect(() => { recover(); }, [recover]); // Includes reconnect; never submits from an effect.
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (["CONFIRMED", "CANCELLED", "EXPIRED", "ALREADY_PAID"].includes(state.phase)) void refreshPendingCheckout();
    if (state.phase === "CONFIRMED") void Promise.all([queryClient.invalidateQueries({ queryKey: ["wallet-balance"] }), queryClient.invalidateQueries({ queryKey: ["wallet-activity"] })]);
  }, [queryClient, refreshPendingCheckout, state.phase]);
  async function approve() {
    if (!await isPaymentOnline()) { setState((old) => ({ ...old, message: "You are offline. Reconnect before approving payment." })); return; }
    try { await controller.approve(); } catch (error) { handleError(error); }
  }
  const terms = state.terms;
  const receipt = state.receipt;
  const terminal = ["CONFIRMED", "CANCELLED", "EXPIRED", "ALREADY_PAID"].includes(state.phase);
  const seconds = terms?.expiresAt ? Math.max(0, Math.ceil((Date.parse(terms.expiresAt) - now) / 1000)) : undefined;
  const title = state.phase === "CONFIRMED" ? "Payment confirmed" : state.phase === "UNKNOWN" ? "Payment not confirmed" : state.phase === "ALREADY_PAID" ? "Already paid" : state.phase === "CANCELLED" ? "Sale cancelled" : state.phase === "EXPIRED" ? "Sale expired" : state.phase === "BLOCKED" ? "Checkout unavailable" : state.phase === "CHECKING" ? "Checking payment" : "Review payment";
  if (state.phase === "SUBMITTING") return <OperationStateScreen busy tone="loading" eyebrow="Payment" title="Processing payment" detail={terms ? `${formatZarMinor(terms.amountMinor)} to ${terms.vendorName} · ${terms.branchName}` : undefined} message="Your payment reference is saved. If the connection is interrupted, UNIFY will recover the recorded result." />;
  return <AppScreen footer={<View style={{ gap: spacing.sm }}>
    {terminal ? <AppButton label="Done" onPress={() => router.replace("/(wallet)/payments")} /> : <>
      <AppButton label={state.phase === "UNKNOWN" ? "Retry same payment" : `Pay ${terms ? formatZarMinor(terms.amountMinor) : ""}`} disabled={isOffline || !terms || seconds === 0 || !(state.phase === "REVIEW" || state.phase === "UNKNOWN" && state.canRetry)} onPress={() => void approve()} />
      <AppButton label="Check payment result" disabled={!ready || isOffline || state.phase === "CHECKING"} onPress={recover} variant="secondary" />
      <AppButton label="Top up wallet" disabled={state.phase === "CHECKING"} onPress={() => router.push("/(wallet)/topup-amount")} variant="secondary" />
      <AppButton label="Leave checkout" disabled={state.phase !== "REVIEW"} onPress={() => void controller.abandon().then(async (left) => { if (left) { await refreshPendingCheckout(); router.replace("/(wallet)/payments"); } })} variant="secondary" />
    </>}
  </View>}>
    <ScreenHeader eyebrow="UNIFY checkout" title={title} meta={input.kind === "POS" ? "The amount is fixed by the vendor. Review before approving." : "Review the vendor and amount before approving."} />
    {terms && <View><InfoRow divider label="Vendor" value={terms.vendorName} /><InfoRow divider label="Branch" value={terms.branchName} />{terms.orderReference && <InfoRow divider label="Order" value={terms.orderReference} />}<InfoRow divider label="Amount" value={formatZarMinor(terms.amountMinor)} />{seconds !== undefined && !terminal && <InfoRow label="Expiry" value={`${seconds}s remaining`} />}</View>}
    {receipt && <View><InfoRow divider label="Transaction" value={receipt.transactionId} /><InfoRow divider label="Completed" value={new Date(receipt.completedAt).toLocaleString()} /><InfoRow label="Wallet balance" value={formatZarMinor(receipt.resultingBalanceMinor)} /></View>}
    <Text accessibilityLiveRegion="polite" style={typography.body}>{isOffline ? "You are offline. Reconnect to enable payment." : state.message}</Text>
  </AppScreen>;
}
