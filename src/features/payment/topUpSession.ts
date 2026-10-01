/**
 * @fileoverview Persists the single in-flight hosted top-up checkout.
 * @module features/payment/topUpSession
 */

import { Platform } from "react-native";

import { deleteSecureValue, getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";
import { assertPaymentScope, getPaymentScope, type PaymentScope } from "./paymentScope";

export const PENDING_TOP_UP_STORAGE_KEY = "unify.payment.pending-topup.v1";

export type PendingTopUp = {
  amountMinor: number;
  authorizationUrl: string;
  createdAt: string;
  currency: "ZAR";
  idempotencyKey: string;
  reference: string;
  status: "PENDING" | "UNKNOWN";
  topUpId: string;
};

let webPendingTopUp: string | null = null;
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(operation: () => Promise<T>): Promise<T> { const result = queue.then(operation, operation); queue = result.catch(() => undefined); return result; }
async function remove() { if (Platform.OS === "web") webPendingTopUp = null; else await deleteSecureValue(PENDING_TOP_UP_STORAGE_KEY); }

export function parsePendingTopUp(rawValue: string | null): PendingTopUp | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Partial<PendingTopUp>;
    const pending: PendingTopUp = {
      amountMinor: Number(parsed.amountMinor),
      authorizationUrl: typeof parsed.authorizationUrl === "string" ? parsed.authorizationUrl : "",
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : "",
      currency: parsed.currency === "ZAR" ? "ZAR" : "ZAR",
      idempotencyKey: typeof parsed.idempotencyKey === "string" ? parsed.idempotencyKey.trim() : "",
      reference: typeof parsed.reference === "string" ? parsed.reference.trim() : "",
      status: parsed.status === "UNKNOWN" ? "UNKNOWN" : "PENDING",
      topUpId: typeof parsed.topUpId === "string" ? parsed.topUpId.trim() : "",
    };

    if (
      !Number.isSafeInteger(pending.amountMinor) ||
      pending.amountMinor <= 0 ||
      (pending.status === "PENDING" && !pending.authorizationUrl) ||
      !Number.isFinite(Date.parse(pending.createdAt)) ||
      !pending.idempotencyKey ||
      !pending.reference ||
      !pending.topUpId
    ) {
      return null;
    }

    return pending;
  } catch {
    return null;
  }
}

export async function savePendingTopUp(pending: PendingTopUp, owner: PaymentScope = getPaymentScope()) {
  if (!parsePendingTopUp(JSON.stringify(pending))) {
    throw new Error("Pending top-up is malformed.");
  }

  const serialized = JSON.stringify({ walletId: owner.walletId, sessionId: owner.sessionId, pending });
  return serial(async () => {
    assertPaymentScope(owner);
    if (Platform.OS === "web") webPendingTopUp = serialized;
    else await saveSecureValue(PENDING_TOP_UP_STORAGE_KEY, serialized);
    assertPaymentScope(owner);
  });
}

export async function loadPendingTopUp() {
  const owner = getPaymentScope();
  return serial(async () => {
    assertPaymentScope(owner);
    const rawValue = Platform.OS === "web" ? webPendingTopUp : await getSecureValue(PENDING_TOP_UP_STORAGE_KEY);
    assertPaymentScope(owner);
    if (!rawValue) return null;
    let stored: { walletId?: string | null; sessionId?: string | null; pending?: PendingTopUp };
    try { stored = JSON.parse(rawValue); } catch { await remove(); return null; }
    // Historical unbound references are preserved for server recovery via return links.
    if (!stored.pending && parsePendingTopUp(rawValue)) return null;
    if (stored.walletId !== owner.walletId || stored.sessionId !== owner.sessionId) return null;
    const pending = parsePendingTopUp(JSON.stringify(stored.pending));
    if (!pending) await remove();
    assertPaymentScope(owner);
    return pending;
  });
}

export async function clearPendingTopUp(owner: PaymentScope = getPaymentScope()) {
  return serial(async () => { assertPaymentScope(owner); await remove(); assertPaymentScope(owner); });
}
