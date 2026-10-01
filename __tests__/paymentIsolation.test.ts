import { QueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";
import { clearPaymentSession, loadPaymentSession, savePaymentSession } from "@/src/features/payment/paymentSession";
import { getPaymentScope, invalidatePaymentScope, paymentQueryKey } from "@/src/features/payment/paymentScope";
import { paymentApiClient } from "@/src/lib/api/apiClient";
jest.mock("expo-crypto", () => ({ randomUUID: () => "request-id" }));
jest.mock("@/src/lib/storage/secureStore", () => {
  const values = new Map<string, string>();
  return { getSecureValue: jest.fn(async (key: string) => values.get(key) ?? null), saveSecureValue: jest.fn(async (key: string, value: string) => { values.set(key, value); }), deleteSecureValue: jest.fn(async (key: string) => { values.delete(key); }) };
});
const expiry = "2099-01-01T00:00:00Z";
const session = (id: string) => ({ sessionId: id, accessToken: id, refreshToken: `${id}-refresh`, accessExpiresAt: expiry, refreshExpiresAt: expiry });
const response = (data: object, status = 200) => ({ ok: status < 400, status, headers: { get: () => null }, json: async () => data }) as unknown as Response;
const originalFetch = global.fetch;
const originalPlatform = Platform.OS;
beforeEach(async () => {
  Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
  process.env.EXPO_PUBLIC_UNIFY_PAYMENT_API_BASE_URL = "https://portal.example";
  await clearPaymentSession();
  invalidatePaymentScope("holder-A");
  await savePaymentSession(session("A"));
});
afterEach(() => { global.fetch = originalFetch; Object.defineProperty(Platform, "OS", { value: originalPlatform, configurable: true }); });
it("does not expose A cached activity to an unactivated or offline B", async () => {
  const client = new QueryClient();
  client.setQueryData(paymentQueryKey("activity"), [{ id: "A-private-row" }]);
  client.setQueryData(paymentQueryKey("balance"), { postedBalanceMinor: 9000 });
  await clearPaymentSession();
  invalidatePaymentScope("holder-B");
  await loadPaymentSession();
  expect(client.getQueryData(paymentQueryKey("activity"))).toBeUndefined();
  expect(client.getQueryData(paymentQueryKey("balance"))).toBeUndefined();
  client.clear();
});
it("rejects a late A read even when transport ignores cancellation", async () => {
  let resolve!: (value: Response) => void;
  let started!: () => void;
  const ready = new Promise<void>(done => { started = done; });
  global.fetch = jest.fn(() => new Promise<Response>(done => { resolve = done; started(); }));
  const pending = paymentApiClient.get("/api/wallet/v1/activity").catch(error => error);
  await ready;
  await clearPaymentSession(); invalidatePaymentScope("holder-B"); await savePaymentSession(session("B"));
  resolve(response({ rows: ["A-private-row"] }));
  expect(await pending).toMatchObject({ name: "AbortError" });
  expect(await loadPaymentSession()).toMatchObject({ sessionId: "B" });
});
it.each([true, false])("a late A refresh cannot save or clear B (success=%s)", async success => {
  const { savePaymentDeviceId } = await import("@/src/features/payment/paymentSession");
  await savePaymentDeviceId("phone");
  let resolve!: (value: Response) => void;
  let started!: () => void;
  const ready = new Promise<void>(done => { started = done; });
  global.fetch = jest.fn().mockResolvedValueOnce(response({}, 401)).mockImplementationOnce(() => new Promise<Response>(done => { resolve = done; started(); }));
  const pending = paymentApiClient.get("/api/wallet/v1/balance").catch(error => error);
  await ready;
  await clearPaymentSession(); invalidatePaymentScope("holder-B"); await savePaymentSession(session("B"));
  resolve(response(success ? session("A") : {}, success ? 200 : 401));
  expect(await pending).toMatchObject({ name: "AbortError" });
  expect(await loadPaymentSession()).toMatchObject({ sessionId: "B" });
  expect(global.fetch).toHaveBeenCalledTimes(2);
});
it("rejects a delayed activation save and preserves generation on token rotation", async () => {
  const owner = getPaymentScope();
  await savePaymentSession({ ...session("A"), accessToken: "rotated" }, owner);
  expect(getPaymentScope().generation).toBe(owner.generation);
  await clearPaymentSession(); invalidatePaymentScope("holder-B"); await savePaymentSession(session("B"));
  await expect(savePaymentSession(session("A"), owner)).rejects.toMatchObject({ name: "AbortError" });
  expect(await loadPaymentSession()).toMatchObject({ sessionId: "B" });
});
