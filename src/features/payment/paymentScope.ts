export type PaymentScope = { walletId: string | null; sessionId: string | null; generation: number; hydrated: boolean };
let scope: PaymentScope = { walletId: null, sessionId: null, generation: 0, hydrated: false };
const listeners = new Set<() => void>();
export const getPaymentScope = () => scope;
export function subscribePaymentScope(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function publish(next: PaymentScope) { scope = next; listeners.forEach(listener => listener()); }
/**
 * Reject work that started under an obsolete wallet generation.
 * A scope is the wallet/session identity captured when asynchronous work begins, not an authentication token.
 */
export function assertPaymentScope(expected: PaymentScope) {
  if (expected.generation !== scope.generation || expected.walletId !== scope.walletId) {
    const error = new Error("Payment account changed while the operation was running.");
    error.name = "AbortError";
    throw error;
  }
}
/**
 * Advance the in-memory generation and hide payment identity synchronously.
 * Requests still finishing under the previous generation can no longer save tokens or expose private results.
 */
export function invalidatePaymentScope(walletId = scope.walletId) {
  publish({ walletId, sessionId: null, generation: scope.generation + 1, hydrated: false });
}
/**
 * Publish the loaded payment-session identity.
 * Token rotation keeps the same cache scope; replacing a known session advances its generation.
 */
export function hydratePaymentScope(sessionId: string | null) {
  if (scope.hydrated && scope.sessionId === sessionId) return;
  publish({ ...scope, sessionId, hydrated: true, generation: scope.hydrated && scope.sessionId !== sessionId ? scope.generation + 1 : scope.generation });
}
/**
 * Build a private cache key from wallet, session, generation and resource.
 * Keep bearer tokens out of keys while separating balances and activity between accounts.
 */
export function paymentQueryKey(resource: string, owner = scope) {
  return ["private-payment", owner.walletId, owner.sessionId, owner.generation, resource] as const;
}
export function paymentQueryPrefix(owner = scope) { return ["private-payment", owner.walletId, owner.sessionId, owner.generation] as const; }
