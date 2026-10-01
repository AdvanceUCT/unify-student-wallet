import { act, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { PaymentScopeBoundary } from "@/src/features/payment/PaymentScopeBoundary";
import { getPaymentScope, hydratePaymentScope, invalidatePaymentScope, paymentQueryKey } from "@/src/features/payment/paymentScope";
import { usePaymentScope } from "@/src/features/payment/usePaymentScope";
import { loadPaymentSession } from "@/src/features/payment/paymentSession";
let mockWalletId = "holder-A";
jest.mock("@/src/features/wallet/WalletSessionProvider", () => ({ useWalletSession: () => ({ session: { walletId: mockWalletId } }) }));
jest.mock("@/src/features/payment/paymentSession", () => ({ clearPaymentSession: jest.fn(async () => {}), loadPaymentSession: jest.fn() }));
jest.mock("@/src/components/OperationStateScreen", () => ({ OperationStateScreen: () => null }));
function Activity() {
  const scope = usePaymentScope();
  const { data } = useQuery({ queryKey: paymentQueryKey("activity", scope), queryFn: async () => "B", enabled: Boolean(scope.sessionId) });
  return <Text>{data as string ?? "unactivated"}</Text>;
}
it("removes departed private queries and hides screens until replacement hydration completes", async () => {
  mockWalletId = "holder-A";
  invalidatePaymentScope(mockWalletId); hydratePaymentScope("A");
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, gcTime: 0, retry: false } } });
  const oldKey = paymentQueryKey("activity");
  client.setQueryData(oldKey, "A-private");
  let hydrate!: () => void;
  jest.mocked(loadPaymentSession).mockImplementationOnce(() => new Promise(resolve => { hydrate = () => { hydratePaymentScope(null); resolve(null); }; }));
  const view = () => <QueryClientProvider client={client}><PaymentScopeBoundary><Activity /></PaymentScopeBoundary></QueryClientProvider>;
  const screen = render(view());
  expect(screen.getByText("A-private")).toBeTruthy();
  act(() => { mockWalletId = "holder-B"; invalidatePaymentScope(mockWalletId); screen.rerender(view()); });
  expect(client.getQueryData(oldKey)).toBeUndefined();
  expect(screen.queryByText("A-private")).toBeNull();
  expect(screen.queryByText("unactivated")).toBeNull();
  expect(getPaymentScope().hydrated).toBe(false);
  await act(async () => hydrate());
  await waitFor(() => expect(screen.getByText("unactivated")).toBeTruthy());
  screen.unmount();
  client.clear();
});
