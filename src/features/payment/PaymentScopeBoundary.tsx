import { Fragment, type PropsWithChildren, useEffect, useLayoutEffect, useState } from "react";
import { OperationStateScreen } from "@/src/components/OperationStateScreen";
import { useQueryClient } from "@tanstack/react-query";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { clearPaymentSession, loadPaymentSession } from "./paymentSession";
import { getPaymentScope, invalidatePaymentScope, paymentQueryPrefix, subscribePaymentScope } from "./paymentScope";
import { usePaymentScope } from "./usePaymentScope";

export function PaymentScopeBoundary({ children }: PropsWithChildren) {
  const { session } = useWalletSession();
  const walletId = session.walletId ?? null;
  const scope = usePaymentScope();
  const client = useQueryClient();
  const [loadError, setLoadError] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  useLayoutEffect(() => {
    let previous = getPaymentScope();
    return subscribePaymentScope(() => {
      const next = getPaymentScope();
      if (previous.generation !== next.generation || previous.walletId !== next.walletId || previous.sessionId !== next.sessionId) {
        const queryKey = paymentQueryPrefix(previous);
        void client.cancelQueries({ queryKey });
        client.removeQueries({ queryKey });
      }
      previous = next;
    });
  }, [client]);
  useLayoutEffect(() => {
    const previous = getPaymentScope();
    if (previous.walletId === walletId) return;
    invalidatePaymentScope(walletId);
    // The first hydration adopts the saved session. Later wallet changes remove it.
    if (previous.walletId) void clearPaymentSession().catch(() => undefined);
  }, [walletId]);
  useEffect(() => {
    let active = true;
    if (!scope.hydrated) void loadPaymentSession({ allowExpired: true }).catch(error => {
      if (active && error?.name !== "AbortError") setLoadError(scope.generation);
    });
    return () => { active = false; };
  }, [scope.generation, scope.hydrated, retry]);
  if (loadError === scope.generation && !scope.hydrated) return <OperationStateScreen tone="error" title="Unable to load payment access" message="Your wallet could not read its saved payment session. Try again to continue." primaryAction={{ label: "Try again", onPress: () => { setLoadError(null); setRetry(value => value + 1); } }} />;
  if (scope.walletId !== walletId || !scope.hydrated) return null;
  return <Fragment key={`${walletId}:${scope.sessionId}:${scope.generation}`}>{children}</Fragment>;
}
