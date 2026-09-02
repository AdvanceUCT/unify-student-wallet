/**
 * @fileoverview Persists the campus payment wallet session in isolated device storage.
 * @module features/payment/paymentStorage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Payment sessions use AsyncStorage exclusively. SecureStore is reserved for
// Askar/Credo credential wallet keys and must never hold payment session data.
const PAYMENT_SESSION_KEY = "unify_payment_session";

export type PaymentSessionData = {
  sessionToken: string;
  studentNumber: string;
  expiresAt: string;
  lastBalanceCents: number;
  lastBalanceZar: string;
  lastUpdated: string;
};

export async function savePaymentSession(session: PaymentSessionData): Promise<void> {
  await AsyncStorage.setItem(PAYMENT_SESSION_KEY, JSON.stringify(session));
}

export async function getPaymentSession(): Promise<PaymentSessionData | null> {
  const raw = await AsyncStorage.getItem(PAYMENT_SESSION_KEY);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as PaymentSessionData;
  if (new Date(parsed.expiresAt) < new Date()) {
    await clearPaymentSession();
    return null;
  }

  return parsed;
}

export async function clearPaymentSession(): Promise<void> {
  await AsyncStorage.removeItem(PAYMENT_SESSION_KEY);
}

export function isSessionValid(session: PaymentSessionData | null): boolean {
  if (!session) return false;
  return new Date(session.expiresAt) > new Date();
}

export async function updateCachedBalance(balanceCents: number, balanceZar: string): Promise<void> {
  const session = await getPaymentSession();
  if (!session) return;

  await savePaymentSession({
    ...session,
    lastBalanceCents: balanceCents,
    lastBalanceZar: balanceZar,
    lastUpdated: new Date().toISOString(),
  });
}
