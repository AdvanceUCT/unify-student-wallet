/**
 * @fileoverview Persists the single in-flight hosted top-up checkout.
 * @module features/payment/topUpSession
 */

import { Platform } from "react-native";

import { deleteSecureValue, getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

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

export async function savePendingTopUp(pending: PendingTopUp) {
  const serialized = JSON.stringify(pending);
  if (!parsePendingTopUp(serialized)) {
    throw new Error("Pending top-up is malformed.");
  }

  if (Platform.OS === "web") {
    webPendingTopUp = serialized;
    return;
  }
  await saveSecureValue(PENDING_TOP_UP_STORAGE_KEY, serialized);
}

export async function loadPendingTopUp() {
  const rawValue = Platform.OS === "web" ? webPendingTopUp : await getSecureValue(PENDING_TOP_UP_STORAGE_KEY);
  const pending = parsePendingTopUp(rawValue);
  if (pending) return pending;
  if (rawValue) await clearPendingTopUp();
  return null;
}

export async function clearPendingTopUp() {
  if (Platform.OS === "web") {
    webPendingTopUp = null;
    return;
  }
  await deleteSecureValue(PENDING_TOP_UP_STORAGE_KEY);
}
