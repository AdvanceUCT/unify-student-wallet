/**
 * @fileoverview Persists the portal-issued payment session separately from the credential wallet.
 * @module features/payment/paymentSession
 */

import { Platform } from "react-native";

import { deleteSecureValue, getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

export const PAYMENT_SESSION_STORAGE_KEY = "unify.payment.session.v1";

export type PaymentSession = {
  accessToken: string;
  expiresAt: string;
  sessionId?: string;
};

let webPaymentSession: string | null = null;

/** Parses a payment session and rejects malformed or expired bearer credentials. */
export function parsePaymentSession(rawValue: string | null, now = Date.now()): PaymentSession | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Partial<PaymentSession>;
    const accessToken = typeof parsed.accessToken === "string" ? parsed.accessToken.trim() : "";
    const expiresAt = typeof parsed.expiresAt === "string" ? parsed.expiresAt : "";
    const expiresAtMs = Date.parse(expiresAt);
    const validSessionId =
      parsed.sessionId === undefined ||
      (typeof parsed.sessionId === "string" && parsed.sessionId.trim().length > 0);

    if (!accessToken || !expiresAt || !Number.isFinite(expiresAtMs) || expiresAtMs <= now || !validSessionId) {
      return null;
    }

    return {
      accessToken,
      expiresAt,
      ...(parsed.sessionId ? { sessionId: parsed.sessionId.trim() } : {}),
    };
  } catch {
    return null;
  }
}

function serializedPaymentSession(session: PaymentSession) {
  const serialized = JSON.stringify(session);
  const validated = parsePaymentSession(serialized);
  if (!validated) {
    throw new Error("Payment session must contain a non-empty access token and a future expiry time.");
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

/** Loads the current session, clearing storage when it is invalid or expired. */
export async function loadPaymentSession(): Promise<PaymentSession | null> {
  const rawValue =
    Platform.OS === "web" ? webPaymentSession : await getSecureValue(PAYMENT_SESSION_STORAGE_KEY);
  if (!rawValue) return null;

  const session = parsePaymentSession(rawValue);
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

