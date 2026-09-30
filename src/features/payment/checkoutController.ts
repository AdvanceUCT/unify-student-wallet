import { ApiClientError } from "@/src/lib/api/apiClient";
import { getWalletBalance, getPaymentByReference, type PaymentReceipt } from "./paymentApi";
import { resolvePaymentRequest, getPaymentRequestReceipt, payRequest } from "./paymentRequestApi";
import { loadCheckout, saveCheckout, clearCheckout, abandonReviewCheckout, type Checkout, type CheckoutTerms } from "./checkoutSession";

export type CheckoutState = { phase: "REVIEW" | "CHECKING" | "SUBMITTING" | "UNKNOWN" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "ALREADY_PAID" | "BLOCKED"; checkout?: Checkout; terms?: CheckoutTerms; receipt?: PaymentReceipt; canRetry?: boolean; message?: string };
const api = { getWalletBalance, getPaymentByReference, resolvePaymentRequest, getPaymentRequestReceipt, payRequest };
const store = { load: loadCheckout, save: saveCheckout, clear: clearCheckout, abandon: abandonReviewCheckout };
export class CheckoutController {
  private busy = false;
  state: CheckoutState = { phase: "CHECKING" };
  constructor(private notify: (state: CheckoutState) => void, private service = api, private storage = store) {}
  private show(state: CheckoutState) { this.state = state; this.notify(state); return state; }
  private async confirmed(checkout: Checkout, receipt: PaymentReceipt) {
    if (checkout.terms && receipt.amountMinor !== checkout.terms.amountMinor) throw new Error("The recovered receipt does not match this checkout.");
    await this.storage.clear(checkout.idempotencyKey);
    return this.show({ phase: "CONFIRMED", checkout, terms: checkout.terms, receipt });
  }
  private async recoverCurrent(): Promise<CheckoutState> {
    let checkout = await this.storage.load();
    if (!checkout) return this.state.phase === "CONFIRMED" ? this.state : this.show({ phase: "BLOCKED", message: "No saved checkout. Scan a payment QR to begin." });
    if (checkout.kind === "STATIC" && checkout.phase === "REVIEW") {
      await this.storage.clear(checkout.idempotencyKey);
      return this.show({ phase: "BLOCKED", message: "Static payment QR codes are no longer supported. Ask the cashier for a POS sale QR." });
    }
    const balance = await this.service.getWalletBalance();
    if (!balance.walletAccountId) throw new Error("The payment service must support account-bound recovery before you can pay.");
    if (checkout.accountId && checkout.accountId !== balance.walletAccountId) return this.show({ phase: "BLOCKED", checkout, terms: checkout.terms, message: "This checkout belongs to another payment account. Sign in to the original account to recover it." });
    if (checkout.kind === "POS") {
      const request = await this.service.resolvePaymentRequest(checkout.id);
      if (request.status === "CANCELLED" || request.status === "EXPIRED") {
        await this.storage.clear(checkout.idempotencyKey);
        return this.show({ phase: request.status, checkout, terms: checkout.terms, message: `This sale is ${request.status.toLowerCase()}. Ask the cashier for a new sale.` });
      }
      if (request.status === "PAID") {
        try { return await this.confirmed(checkout, await this.service.getPaymentRequestReceipt(checkout.id)); }
        catch (error) {
          if (!(error instanceof ApiClientError) || error.code !== "RECEIPT_NOT_FOUND") throw error;
          await this.storage.clear(checkout.idempotencyKey);
          return this.show({ phase: "ALREADY_PAID", checkout, message: "Already paid. This account cannot access the other payer's receipt." });
        }
      }
      const resolvedTerms: CheckoutTerms = { amountMinor: request.amountMinor, currency: "ZAR", vendorName: request.vendorName, branchName: request.branchName, vendorBranchId: request.branchId, orderReference: request.orderReference, expiresAt: request.expiresAt };
      if (checkout.terms && (checkout.terms.amountMinor !== resolvedTerms.amountMinor || checkout.terms.vendorBranchId !== resolvedTerms.vendorBranchId || checkout.terms.orderReference !== resolvedTerms.orderReference || checkout.terms.expiresAt !== resolvedTerms.expiresAt)) throw new Error("The sale terms changed. Contact the cashier.");
      if (checkout.phase === "REVIEW") checkout = await this.storage.save({ ...checkout, terms: resolvedTerms, accountId: balance.walletAccountId });
      else if (!checkout.terms) checkout = await this.storage.save({ ...checkout, terms: resolvedTerms });
    }
    if (checkout.phase !== "REVIEW") {
      const recorded = await this.service.getPaymentByReference(checkout.idempotencyKey);
      if (recorded.status === "COMPLETED") {
        if (checkout.terms && (recorded.vendorBranchId !== checkout.terms.vendorBranchId || recorded.amountMinor !== checkout.terms.amountMinor || checkout.kind === "POS" && recorded.orderReference !== checkout.terms.orderReference)) throw new Error("The submission reference belongs to different payment terms.");
        return this.confirmed(checkout, recorded);
      }
      return this.show({ phase: "UNKNOWN", checkout, terms: checkout.terms, canRetry: Boolean(checkout.kind === "POS" && checkout.accountId && !checkout.legacyUnbound), message: checkout.kind === "STATIC" ? "Static payments are retired. The original submission reference is preserved for receipt recovery; it cannot be resubmitted." : checkout.legacyUnbound ? "This saved payment predates account binding. Its original reference is preserved. You can recover its receipt; an unrecorded legacy submission cannot safely be reassigned to an account." : "UNIFY has not recorded a completed payment for this reference yet. This does not prove failure. You may explicitly retry the same payment with its original reference." });
    }
    return this.show({ phase: "REVIEW", checkout, terms: checkout.terms });
  }
  async recover() {
    if (this.busy) return this.state;
    if (["CONFIRMED", "CANCELLED", "EXPIRED", "ALREADY_PAID"].includes(this.state.phase)) return this.state;
    this.busy = true; this.show({ ...this.state, phase: "CHECKING", canRetry: false });
    try { return await this.recoverCurrent(); }
    catch (error) { this.show({ ...this.state, phase: "UNKNOWN", canRetry: false, message: error instanceof Error ? error.message : "Reconnect to check the payment result." }); throw error; }
    finally { this.busy = false; }
  }
  async approve() {
    if (this.busy || !(this.state.phase === "REVIEW" || this.state.phase === "UNKNOWN" && this.state.canRetry)) return;
    this.busy = true;
    try {
      this.show({ ...this.state, phase: "CHECKING", canRetry: false });
      const recovered = await this.recoverCurrent();
      if (!(recovered.phase === "REVIEW" || recovered.phase === "UNKNOWN" && recovered.canRetry) || !recovered.checkout || recovered.checkout.kind !== "POS" || !recovered.checkout.accountId || !recovered.terms) return;
      // Secure storage must succeed before the financial request leaves the phone.
      const checkout = await this.storage.save({ ...recovered.checkout, phase: "SUBMITTED" });
      if (checkout.kind !== "POS") throw new Error("Only POS sales can be submitted.");
      this.show({ phase: "SUBMITTING", checkout, terms: checkout.terms });
      const receipt = await this.service.payRequest(checkout.id, checkout.idempotencyKey);
      await this.confirmed(checkout, receipt);
    } catch (error) {
      const checkout = await this.storage.load();
      if (checkout?.phase === "SUBMITTED") await this.storage.save({ ...checkout, phase: "UNKNOWN" });
      this.show({ phase: "UNKNOWN", checkout: checkout ?? undefined, terms: checkout?.terms, canRetry: false, message: `${error instanceof Error ? error.message : "Payment result is unknown."} Check UNIFY before retrying.` });
      throw error;
    } finally { this.busy = false; }
  }
  async abandon() {
    if (this.busy) return false;
    return this.storage.abandon();
  }
}
