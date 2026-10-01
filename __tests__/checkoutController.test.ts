import { CheckoutController } from "@/src/features/payment/checkoutController";
import { abandonReviewCheckout, clearCheckout, loadCheckout, saveCheckout, selectPosCheckout, selectStaticCheckout, selectStaticQr, LEGACY_POS_STORAGE_KEY } from "@/src/features/payment/checkoutSession";
import { getWalletBalance, getPaymentByReference, resolvePaymentDestination, submitPayment } from "@/src/features/payment/paymentApi";
import { resolvePaymentRequest, payRequest, getPaymentRequestReceipt } from "@/src/features/payment/paymentRequestApi";
import { saveSecureValue } from "@/src/lib/storage/secureStore";
import { ApiClientError } from "@/src/lib/api/apiClient";
import { invalidatePaymentScope } from "@/src/features/payment/paymentScope";
jest.mock("expo-crypto", () => ({ randomUUID: jest.fn(() => "original-key") }));
jest.mock("@/src/features/payment/paymentApi", () => ({ getWalletBalance: jest.fn(), getPaymentByReference: jest.fn(), resolvePaymentDestination: jest.fn(), submitPayment: jest.fn() }));
jest.mock("@/src/features/payment/paymentRequestApi", () => ({ resolvePaymentRequest: jest.fn(), payRequest: jest.fn(), getPaymentRequestReceipt: jest.fn() }));
jest.mock("@/src/lib/storage/secureStore", () => {
  const values = new Map<string, string>();
  return { getSecureValue: jest.fn(async (key: string) => values.get(key) ?? null), saveSecureValue: jest.fn(async (key: string, value: string) => { values.set(key, value); }), deleteSecureValue: jest.fn(async (key: string) => { values.delete(key); }) };
});
const id = "a".repeat(32);
const destination = { vendorName: "Test", branchName: "Counter", vendorBranchId: "branch", currency: "ZAR" as const };
const pos = { id, orderReference: "sale-1", branchId: "branch", ...destination, amountMinor: 3500, status: "PENDING" as const, expiresAt: "2099-01-01T00:00:00.000Z" };
const receipt = { ...destination, transactionId: "transaction", amountMinor: 3500, currency: "ZAR" as const, resultingBalanceMinor: 6500, completedAt: "2026-09-30T10:00:00.000Z", status: "COMPLETED" as const, orderReference: "sale-1" };
beforeEach(async () => {
  await clearCheckout(); jest.clearAllMocks();
  jest.mocked(getWalletBalance).mockResolvedValue({ walletAccountId: "account", accountStatus: "ACTIVE", postedBalanceMinor: 10000, currency: "ZAR", updatedAt: receipt.completedAt });
  jest.mocked(getPaymentByReference).mockResolvedValue({ status: "NOT_RECORDED" });
  jest.mocked(resolvePaymentDestination).mockResolvedValue(destination);
  jest.mocked(resolvePaymentRequest).mockResolvedValue(pos);
  jest.mocked(submitPayment).mockResolvedValue(receipt);
  jest.mocked(payRequest).mockResolvedValue({ ...receipt, id, branchId: "branch", expiresAt: pos.expiresAt, orderReference: "sale-1" });
});
describe("POS recovery", () => {
  it("preserves the original submission when a late failure arrives after account replacement", async () => {
    const controller = await begin();
    let fail!: (error: Error) => void;
    let submitted!: () => void;
    const started = new Promise<void>(resolve => { submitted = resolve; });
    jest.mocked(payRequest).mockImplementationOnce(() => { submitted(); return new Promise((_, reject) => { fail = reject; }); });
    const approval = controller.approve();
    await started;
    invalidatePaymentScope("replacement-wallet");
    fail(new Error("late offline failure"));
    await expect(approval).rejects.toMatchObject({ name: "AbortError" });
    expect(await loadCheckout()).toMatchObject({ accountId: "account", phase: "SUBMITTED", idempotencyKey: "original-key" });
  });
  async function begin() {
    await selectPosCheckout(id);
    const controller = new CheckoutController(() => {}); await controller.recover(); return controller;
  }
  it("preserves an unknown outcome and rejects replacement and account switching", async () => {
    const controller = await begin();
    jest.mocked(payRequest).mockRejectedValueOnce(new ApiClientError("offline", "network"));
    await expect(controller.approve()).rejects.toThrow("offline");
    await expect(selectPosCheckout("b".repeat(32))).rejects.toThrow("Recover");
    jest.mocked(getWalletBalance).mockResolvedValue({ walletAccountId: "other-account", accountStatus: "ACTIVE", postedBalanceMinor: 10000, currency: "ZAR", updatedAt: receipt.completedAt });
    const reopened = new CheckoutController(() => {}); expect((await reopened.recover()).phase).toBe("BLOCKED");
    await reopened.approve(); expect((await loadCheckout())?.accountId).toBe("account");
    expect(getPaymentByReference).not.toHaveBeenCalled();
  });
  it("treats NOT_RECORDED as unknown, then retries only the original terms and key", async () => {
    const controller = await begin(); const checkout = (await loadCheckout())!; await saveCheckout({ ...checkout, phase: "SUBMITTED" });
    const reopened = new CheckoutController(() => {}); expect(await reopened.recover()).toMatchObject({ phase: "UNKNOWN", canRetry: true });
    expect(submitPayment).not.toHaveBeenCalled(); expect(payRequest).not.toHaveBeenCalled();
    await reopened.approve(); expect(reopened.state.phase).toBe("CONFIRMED"); expect(await loadCheckout()).toBeNull();
    expect(payRequest).toHaveBeenCalledWith(id, "original-key");
    expect(controller.state.phase).toBe("REVIEW");
  });
  it("does not transmit if secure storage fails before submission", async () => {
    const controller = await begin();
    // Recovery saves review state once; reject the following SUBMITTED write.
    const implementation = jest.mocked(saveSecureValue).getMockImplementation()!;
    jest.mocked(saveSecureValue).mockImplementationOnce(implementation).mockRejectedValueOnce(new Error("secure write failed"));
    await expect(controller.approve()).rejects.toThrow("secure write failed"); expect(payRequest).not.toHaveBeenCalled(); expect(submitPayment).not.toHaveBeenCalled();
  });
});
test.each(["CANCELLED", "EXPIRED"] as const)("clears an authoritative %s sale", async (status) => {
  await selectPosCheckout(id); jest.mocked(resolvePaymentRequest).mockResolvedValue({ ...pos, status });
  expect((await new CheckoutController(() => {}).recover()).phase).toBe(status); expect(await loadCheckout()).toBeNull();
});
test("another payer's paid sale never exposes their receipt", async () => {
  await selectPosCheckout(id); jest.mocked(resolvePaymentRequest).mockResolvedValue({ ...pos, status: "PAID" });
  jest.mocked(getPaymentRequestReceipt).mockRejectedValue(new ApiClientError("not your receipt", "http", 404, "RECEIPT_NOT_FOUND"));
  expect((await new CheckoutController(() => {}).recover()).phase).toBe("ALREADY_PAID"); expect(await loadCheckout()).toBeNull();
});
test("legacy references migrate with their exact key and cannot acquire an invented account binding", async () => {
  await saveSecureValue(LEGACY_POS_STORAGE_KEY, JSON.stringify({ id, idempotencyKey: "legacy-key", submitted: true }));
  const controller = new CheckoutController(() => {}); expect(await controller.recover()).toMatchObject({ phase: "UNKNOWN", canRetry: false });
  expect(await loadCheckout()).toMatchObject({ id, idempotencyKey: "legacy-key", legacyUnbound: true });
  await controller.approve(); expect(payRequest).not.toHaveBeenCalled();
});
test("static scans and amount selection cannot create a checkout", async () => {
  await expect(selectStaticQr("static_qr")).rejects.toThrow("no longer supported");
  await expect(selectStaticCheckout({ qrIdentifier: "static_qr", amountMinor: 3500, idempotencyKey: "original-key" })).rejects.toThrow("no longer supported");
  expect(await loadCheckout()).toBeNull();
});

test.each(["NOT_RECORDED", "COMPLETED"] as const)("legacy static %s recovery never resubmits", async (status) => {
  await saveCheckout({ version: 2, kind: "STATIC", qrIdentifier: "static_qr", amountMinor: 3500, idempotencyKey: "legacy-static-key", phase: "UNKNOWN", accountId: "account", terms: { ...destination, amountMinor: 3500 } });
  jest.mocked(getPaymentByReference).mockResolvedValue(status === "COMPLETED" ? receipt : { status });
  const controller = new CheckoutController(() => {});
  expect(await controller.recover()).toMatchObject(status === "COMPLETED" ? { phase: "CONFIRMED", receipt } : { phase: "UNKNOWN", canRetry: false });
  await controller.approve();
  expect(submitPayment).not.toHaveBeenCalled(); expect(payRequest).not.toHaveBeenCalled();
  expect(resolvePaymentDestination).not.toHaveBeenCalled();
  expect(getPaymentByReference).toHaveBeenCalledWith("legacy-static-key");
});
test("leaving review cannot race a durable submission and erase its state", async () => {
  await selectPosCheckout(id);
  const controller = new CheckoutController(() => {}); await controller.recover();
  const checkout = (await loadCheckout())!;
  const submission = saveCheckout({ ...checkout, phase: "SUBMITTED" });
  const abandoned = abandonReviewCheckout();
  await submission; expect(await abandoned).toBe(false); expect((await loadCheckout())?.phase).toBe("SUBMITTED");
});
