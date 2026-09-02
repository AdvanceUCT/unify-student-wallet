/**
 * @fileoverview Authenticates the campus payment wallet using the holder's stored credential.
 * @module features/payment/paymentAuth
 */

import Constants from "expo-constants";

import { credentialMetadata } from "@/src/features/wallet/credentialMetadata";
import { getStoredCredentialsLazy } from "@/src/features/wallet/holderAgentRuntime";

import {
  clearPaymentSession,
  getPaymentSession,
  isSessionValid,
  savePaymentSession,
  type PaymentSessionData,
} from "./paymentStorage";

const PAYMENT_API_URL = (Constants.expoConfig?.extra?.paymentApiUrl as string | undefined) ?? "http://localhost:3000";

type SessionResponse = {
  sessionToken: string;
  expiresAt: string;
};

export async function getStudentNumberFromCredential(): Promise<string | null> {
  try {
    const credentials = await getStoredCredentialsLazy();
    if (!credentials.length) return null;
    return credentialMetadata(credentials[0]).studentNumber ?? null;
  } catch {
    // The holder agent runtime may be unavailable (e.g. unsupported web build,
    // or not yet resumed). Treat that the same as "no credential yet" so the
    // wallet shows guidance instead of crashing.
    return null;
  }
}

export async function createPaymentSession(): Promise<PaymentSessionData | null> {
  const studentNumber = await getStudentNumberFromCredential();
  if (!studentNumber) return null;

  try {
    const response = await fetch(`${PAYMENT_API_URL}/api/wallet/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // For the pilot, the studentNumber itself is the proof. In production
      // this would be a real AnonCreds zero-knowledge proof presentation.
      body: JSON.stringify({ studentNumber, credentialProof: { studentNumber } }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as SessionResponse;
    const session: PaymentSessionData = {
      sessionToken: data.sessionToken,
      studentNumber,
      expiresAt: data.expiresAt,
      lastBalanceCents: 0,
      lastBalanceZar: "R 0.00",
      lastUpdated: new Date().toISOString(),
    };
    await savePaymentSession(session);
    return session;
  } catch {
    return null;
  }
}

export async function refreshPaymentSession(currentToken: string): Promise<PaymentSessionData | null> {
  try {
    const response = await fetch(`${PAYMENT_API_URL}/api/wallet/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    if (!response.ok) {
      await clearPaymentSession();
      return null;
    }

    const data = (await response.json()) as SessionResponse;
    const existing = await getPaymentSession();
    const session: PaymentSessionData = {
      sessionToken: data.sessionToken,
      studentNumber: existing?.studentNumber ?? "",
      expiresAt: data.expiresAt,
      lastBalanceCents: existing?.lastBalanceCents ?? 0,
      lastBalanceZar: existing?.lastBalanceZar ?? "R 0.00",
      lastUpdated: new Date().toISOString(),
    };
    await savePaymentSession(session);
    return session;
  } catch {
    await clearPaymentSession();
    return null;
  }
}

export async function getValidSession(): Promise<PaymentSessionData | null> {
  const stored = await getPaymentSession();
  if (stored && isSessionValid(stored)) return stored;

  if (stored) {
    const refreshed = await refreshPaymentSession(stored.sessionToken);
    if (refreshed) return refreshed;
  }

  return createPaymentSession();
}
