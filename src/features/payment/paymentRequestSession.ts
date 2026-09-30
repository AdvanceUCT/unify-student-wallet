import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { deleteSecureValue, getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";
const KEY = "unify.payment.pending-request.v1";
let webValue: string | null = null;
export type PendingPaymentRequest = { id: string; idempotencyKey: string; submitted: boolean };
export async function loadPendingPaymentRequest(): Promise<PendingPaymentRequest | null> {
  const raw = Platform.OS === "web" ? webValue : await getSecureValue(KEY);
  try {
    const parsed = JSON.parse(raw ?? "null");
    if (parsed && /^[A-Za-z0-9_-]{32}$/.test(parsed.id) && typeof parsed.idempotencyKey === "string" && parsed.idempotencyKey.length > 0 && typeof parsed.submitted === "boolean") return parsed;
  } catch { /* Malformed state cannot authorise a payment. */ }
  return null;
}
export async function savePendingPaymentRequest(value: PendingPaymentRequest) {
  const raw = JSON.stringify(value);
  if (Platform.OS === "web") webValue = raw;
  else await saveSecureValue(KEY, raw);
}
export async function selectPaymentRequest(id: string) {
  if (!/^[A-Za-z0-9_-]{32}$/.test(id)) throw new Error("Invalid payment request.");
  const old = await loadPendingPaymentRequest();
  if (old?.id === id) return old;
  if (old?.submitted) throw new Error("Recover the interrupted payment before scanning another sale.");
  const next = { id, idempotencyKey: Crypto.randomUUID(), submitted: false };
  await savePendingPaymentRequest(next); return next;
}
export async function clearPendingPaymentRequest() {
  webValue = null;
  if (Platform.OS !== "web") await deleteSecureValue(KEY);
}
