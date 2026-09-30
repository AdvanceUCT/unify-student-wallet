import { parsePaymentRequestLink } from "@/src/lib/validation/qrPayload";
import { clearPendingPaymentRequest, loadPendingPaymentRequest, selectPaymentRequest, savePendingPaymentRequest } from "@/src/features/payment/paymentRequestSession";
jest.mock("expo-crypto", () => ({ randomUUID: jest.fn(() => "stable-payment-key") }));
jest.mock("@/src/lib/storage/secureStore", () => {
  const store = new Map<string,string>();
  return { getSecureValue: jest.fn(async(key: string) => store.get(key) ?? null), saveSecureValue: jest.fn(async(key: string,value: string) => { store.set(key,value); }), deleteSecureValue: jest.fn(async(key: string) => { store.delete(key); }) };
});
beforeEach(async () => { await clearPendingPaymentRequest(); });
const id = "a".repeat(32);
test("QR parsing rejects embedded values and unrelated schemes", () => {
  expect(parsePaymentRequestLink(`unifywallet://pay-request/${id}`)).toEqual({ ok: true, id });
  for(const value of [`unifywallet://pay-request/${id}?amountMinor=1`, `unifywallet://pay-request/${id}#x`, `https://evil.example/pay-request/${id}`, `unifywallet://pay/${id}`, `unifywallet://pay-request/${id}/extra`]) expect(parsePaymentRequestLink(value).ok).toBe(false);
});
test("repeated scans preserve the submission key and interrupted requests block replacement", async () => {
  const selected = await selectPaymentRequest(id);
  expect(await selectPaymentRequest(id)).toEqual(selected);
  await savePendingPaymentRequest({ ...selected, submitted: true });
  await expect(selectPaymentRequest("b".repeat(32))).rejects.toThrow("Recover the interrupted payment");
  expect((await loadPendingPaymentRequest())?.idempotencyKey).toBe(selected.idempotencyKey);
});
