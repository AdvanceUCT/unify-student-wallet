export type PaymentScope = { walletId: string | null; sessionId: string | null; generation: number; hydrated: boolean };
let scope: PaymentScope = { walletId: null, sessionId: null, generation: 0, hydrated: false };
const listeners = new Set<() => void>();
export const getPaymentScope = () => scope;
export function subscribePaymentScope(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function publish(next: PaymentScope) { scope = next; listeners.forEach(listener => listener()); }
export function assertPaymentScope(expected: PaymentScope) {
  if (expected.generation !== scope.generation || expected.walletId !== scope.walletId) {
    const error = new Error("Payment account changed while the operation was running.");
    error.name = "AbortError";
    throw error;
  }
}
export function invalidatePaymentScope(walletId = scope.walletId) {
  publish({ walletId, sessionId: null, generation: scope.generation + 1, hydrated: false });
}
export function hydratePaymentScope(sessionId: string | null) {
  if (scope.hydrated && scope.sessionId === sessionId) return;
  publish({ ...scope, sessionId, hydrated: true, generation: scope.hydrated && scope.sessionId !== sessionId ? scope.generation + 1 : scope.generation });
}
export function paymentQueryKey(resource: string, owner = scope) {
  return ["private-payment", owner.walletId, owner.sessionId, owner.generation, resource] as const;
}
export function paymentQueryPrefix(owner = scope) { return ["private-payment", owner.walletId, owner.sessionId, owner.generation] as const; }
