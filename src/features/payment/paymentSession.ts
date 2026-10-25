/**
 * @fileoverview Persists the portal-issued payment session separately from the credential wallet.
 * @module features/payment/paymentSession
 */

import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

import { deleteSecureValue, getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

import { assertPaymentScope, getPaymentScope, hydratePaymentScope, invalidatePaymentScope, type PaymentScope } from "./paymentScope";

export const PAYMENT_SESSION_STORAGE_KEY = "unify.payment.session.v1";
export const PAYMENT_DEVICE_ID_STORAGE_KEY = "unify.payment.device-id.v1";

export type PaymentSession = {
  accessToken: string;
  accessExpiresAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
  sessionId: string;
};

let cachedSession: PaymentSession | null = null;
let storageQueue: Promise<unknown> = Promise.resolve();
/**
 * Keep payment-session storage operations in order even after one fails.
 * Callers still receive their own errors, and each operation checks scope inside this queue.
 */
function serializedStorage<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation, operation);
  storageQueue = result.catch(() => undefined);
  return result;
}
export function capturedPaymentSession() { return cachedSession; }
let webPaymentSession: string | null = null;
let webPaymentDeviceId: string | null = null;

/**
 * Validate saved token fields and reject an expired refresh window.
 * An expired access token can remain usable for obtaining fresh access through the refresh endpoint.
 */
export function parsePaymentSession(rawValue: string | null, now = Date.now()): PaymentSession | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Partial<PaymentSession>;
    const accessToken = typeof parsed.accessToken === "string" ? parsed.accessToken.trim() : "";
    const accessExpiresAt = typeof parsed.accessExpiresAt === "string" ? parsed.accessExpiresAt : "";
    const refreshToken = typeof parsed.refreshToken === "string" ? parsed.refreshToken.trim() : "";
    const refreshExpiresAt = typeof parsed.refreshExpiresAt === "string" ? parsed.refreshExpiresAt : "";
    const accessExpiresAtMs = Date.parse(accessExpiresAt);
    const refreshExpiresAtMs = Date.parse(refreshExpiresAt);
    const sessionId = typeof parsed.sessionId === "string" ? parsed.sessionId.trim() : "";

    if (
      !accessToken ||
      !refreshToken ||
      !accessExpiresAt ||
      !refreshExpiresAt ||
      !Number.isFinite(accessExpiresAtMs) ||
      !Number.isFinite(refreshExpiresAtMs) ||
      refreshExpiresAtMs <= now ||
      !sessionId
    ) {
      return null;
    }

    return {
      accessToken,
      accessExpiresAt,
      refreshToken,
      refreshExpiresAt,
      sessionId,
    };
  } catch {
    return null;
  }
}

function serializedPaymentSession(session: PaymentSession) {
  const serialized = JSON.stringify(session);
  const validated = parsePaymentSession(serialized, Date.now() - 1);
  if (!validated) {
    throw new Error("Payment session must contain access, refresh, and refresh expiry credentials.");
  }
  return JSON.stringify(validated);
}

/**
 * Validate and save tokens only for the captured scope, checking again inside the storage queue.
 * Fence an old session before yielding when its ID changes; ordinary token rotation preserves its cache identity.
 */
export async function savePaymentSession(session: PaymentSession, expected = getPaymentScope()) {
  assertPaymentScope(expected);
  const serialized = serializedPaymentSession(session);
  // Fence old requests immediately, before storage work yields.
  if (getPaymentScope().sessionId && getPaymentScope().sessionId !== session.sessionId) invalidatePaymentScope();
  const saving = getPaymentScope();
  return serializedStorage(async () => {
    assertPaymentScope(saving);
    if (Platform.OS === "web") webPaymentSession = serialized;
    else await saveSecureValue(PAYMENT_SESSION_STORAGE_KEY, serialized);
    assertPaymentScope(saving);
    cachedSession = session;
    hydratePaymentScope(session.sessionId);
  });
}

/**
 * Read saved payment authentication under its starting scope and remove malformed or expired state.
 * Recovery can request allowExpired to read historical credentials; callers still rely on server authorization.
 */
export async function loadPaymentSession(options: { allowExpired?: boolean } = {}): Promise<PaymentSession | null> {
  const owner = getPaymentScope();
  return serializedStorage(async () => {
    assertPaymentScope(owner);
    const raw = Platform.OS === "web" ? webPaymentSession : await getSecureValue(PAYMENT_SESSION_STORAGE_KEY);
    assertPaymentScope(owner);
    const session = parsePaymentSession(raw, options.allowExpired ? 0 : Date.now());
    if (!session && raw) {
      if (Platform.OS === "web") webPaymentSession = null;
      else await deleteSecureValue(PAYMENT_SESSION_STORAGE_KEY);
      assertPaymentScope(owner);
    }
    cachedSession = session;
    hydratePaymentScope(session?.sessionId ?? null);
    return session;
  });
}

/**
 * Invalidate the current generation before deleting credentials so old requests lose ownership immediately.
 * Check ownership during queued deletion to avoid clearing a subsequently activated session.
 */
export async function clearPaymentSession(expected?: PaymentScope) {
  if (expected) assertPaymentScope(expected);
  invalidatePaymentScope();
  cachedSession = null;
  const owner = getPaymentScope();
  return serializedStorage(async () => {
    assertPaymentScope(owner);
    if (Platform.OS === "web") webPaymentSession = null;
    else await deleteSecureValue(PAYMENT_SESSION_STORAGE_KEY);
    assertPaymentScope(owner);
    hydratePaymentScope(null);
  });
}

export async function loadPaymentDeviceId() {
  const owner = getPaymentScope();
  return serializedStorage(async () => {
    assertPaymentScope(owner);
    const value = Platform.OS === "web" ? webPaymentDeviceId : await getSecureValue(PAYMENT_DEVICE_ID_STORAGE_KEY);
    assertPaymentScope(owner);
    return value;
  });
}

export async function savePaymentDeviceId(deviceId: string) {
  const normalized = deviceId.trim();
  if (!normalized) throw new Error("Payment device ID cannot be empty.");
  const owner = getPaymentScope();
  return serializedStorage(async () => {
    assertPaymentScope(owner);
    if (Platform.OS === "web") webPaymentDeviceId = normalized;
    else await saveSecureValue(PAYMENT_DEVICE_ID_STORAGE_KEY, normalized);
    assertPaymentScope(owner);
  });
}

export async function clearPaymentDeviceId() {
  const owner = getPaymentScope();
  return serializedStorage(async () => {
    assertPaymentScope(owner);
    if (Platform.OS === "web") webPaymentDeviceId = null;
    else await deleteSecureValue(PAYMENT_DEVICE_ID_STORAGE_KEY);
    assertPaymentScope(owner);
  });
}

/**
 * Read or create one device reference inside the storage queue.
 * Scope checks prevent delayed device setup from being reused after a wallet replacement.
 */
export async function getOrCreatePaymentDeviceId() {
  const owner = getPaymentScope();
  return serializedStorage(async () => {
    assertPaymentScope(owner);
    const existing = Platform.OS === "web" ? webPaymentDeviceId : await getSecureValue(PAYMENT_DEVICE_ID_STORAGE_KEY);
    assertPaymentScope(owner);
    if (existing) return existing;
    const deviceId = Crypto.randomUUID();
    if (Platform.OS === "web") webPaymentDeviceId = deviceId;
    else await saveSecureValue(PAYMENT_DEVICE_ID_STORAGE_KEY, deviceId);
    assertPaymentScope(owner);
    return deviceId;
  });
}
