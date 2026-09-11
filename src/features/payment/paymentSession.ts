/**
 * @fileoverview Persists the portal-issued payment session separately from the credential wallet.
 * @module features/payment/paymentSession
 */

import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

import { deleteSecureValue, getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

export const PAYMENT_SESSION_STORAGE_KEY = "unify.payment.session.v1";
export const PAYMENT_DEVICE_ID_STORAGE_KEY = "unify.payment.device-id.v1";

export type PaymentSession = {
  accessToken: string;
  accessExpiresAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
  sessionId: string;
};

let webPaymentSession: string | null = null;
let webPaymentDeviceId: string | null = null;

/** Parses a payment session and rejects malformed or expired bearer credentials. */
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

/** Saves a valid payment session without mixing it into credential-wallet state. */
export async function savePaymentSession(session: PaymentSession) {
  const serialized = serializedPaymentSession(session);
  if (Platform.OS === "web") {
    webPaymentSession = serialized;
    return;
  }
  await saveSecureValue(PAYMENT_SESSION_STORAGE_KEY, serialized);
}

/** Loads the current session. Expired access tokens are kept so the API client can refresh them. */
export async function loadPaymentSession(options: { allowExpired?: boolean } = {}): Promise<PaymentSession | null> {
  const rawValue =
    Platform.OS === "web" ? webPaymentSession : await getSecureValue(PAYMENT_SESSION_STORAGE_KEY);
  if (!rawValue) return null;

  const session = parsePaymentSession(rawValue, options.allowExpired ? 0 : Date.now());
  if (session) return session;

  await clearPaymentSession();
  return null;
}

/** Removes the payment bearer credential from this app session or device. */
export async function clearPaymentSession() {
  if (Platform.OS === "web") {
    webPaymentSession = null;
    return;
  }
  await deleteSecureValue(PAYMENT_SESSION_STORAGE_KEY);
}

export async function loadPaymentDeviceId() {
  return Platform.OS === "web" ? webPaymentDeviceId : await getSecureValue(PAYMENT_DEVICE_ID_STORAGE_KEY);
}

export async function savePaymentDeviceId(deviceId: string) {
  const normalized = deviceId.trim();
  if (!normalized) throw new Error("Payment device ID cannot be empty.");
  if (Platform.OS === "web") {
    webPaymentDeviceId = normalized;
    return;
  }
  await saveSecureValue(PAYMENT_DEVICE_ID_STORAGE_KEY, normalized);
}

export async function clearPaymentDeviceId() {
  if (Platform.OS === "web") {
    webPaymentDeviceId = null;
    return;
  }
  await deleteSecureValue(PAYMENT_DEVICE_ID_STORAGE_KEY);
}

export async function getOrCreatePaymentDeviceId() {
  const existing = await loadPaymentDeviceId();
  if (existing) return existing;

  const deviceId = Crypto.randomUUID();
  await savePaymentDeviceId(deviceId);
  return deviceId;
}
