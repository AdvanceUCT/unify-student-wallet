// Compatibility adapter for existing deep-link and sign-out paths.
import { clearCheckout, loadCheckout, saveCheckout, selectPosCheckout } from "./checkoutSession";
export type PendingPaymentRequest = { id: string; idempotencyKey: string; submitted: boolean };
export async function loadPendingPaymentRequest(): Promise<PendingPaymentRequest | null> {
  const checkout = await loadCheckout();
  return checkout?.kind === "POS" ? { id: checkout.id, idempotencyKey: checkout.idempotencyKey, submitted: checkout.phase !== "REVIEW" } : null;
}
export async function savePendingPaymentRequest(value: PendingPaymentRequest) {
  const old = await loadCheckout();
  if (!old || old.kind !== "POS" || old.id !== value.id || old.idempotencyKey !== value.idempotencyKey) throw new Error("Payment reference changed.");
  await saveCheckout({ ...old, phase: value.submitted ? "UNKNOWN" : "REVIEW" });
}
export async function selectPaymentRequest(id: string) {
  await selectPosCheckout(id); return (await loadPendingPaymentRequest())!;
}
export async function clearPendingPaymentRequest() {
  await clearCheckout();
}
