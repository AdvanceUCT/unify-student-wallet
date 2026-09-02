/**
 * @fileoverview Sends authenticated HTTP requests to the campus payment wallet API.
 * @module features/payment/paymentApi
 */

import NetInfo from "@react-native-community/netinfo";
import Constants from "expo-constants";

import { getValidSession, refreshPaymentSession } from "./paymentAuth";
import { clearPaymentSession } from "./paymentStorage";

const PAYMENT_API_URL = (Constants.expoConfig?.extra?.paymentApiUrl as string | undefined) ?? "http://localhost:3000";

export type WalletTransaction = {
  id: string;
  type: string;
  amountCents: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  status: string;
  createdAt: string;
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; code: string };

function codeForStatus(status: number) {
  switch (status) {
    case 402:
      return "insufficient_balance";
    case 503:
      return "wallet_disabled";
    case 404:
      return "not_found";
    default:
      return "api_error";
  }
}

async function makeAuthenticatedRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    return { ok: false, error: "You are offline. Connect to the internet and try again.", code: "offline" };
  }

  const session = await getValidSession();
  if (!session) {
    return { ok: false, error: "Please accept your student credential to activate payments.", code: "no_session" };
  }

  let response = await fetch(`${PAYMENT_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.sessionToken}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    const refreshed = await refreshPaymentSession(session.sessionToken);
    if (refreshed) {
      response = await fetch(`${PAYMENT_API_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshed.sessionToken}`,
          ...options.headers,
        },
      });
    }

    if (response.status === 401) {
      await clearPaymentSession();
      return { ok: false, error: "Session expired. Please try again.", code: "session_expired" };
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body && typeof body === "object" && "error" in body && typeof (body as { error?: unknown }).error === "string"
      ? (body as { error: string }).error
      : `Request failed with status ${response.status}.`;
    return { ok: false, error: message, code: codeForStatus(response.status) };
  }

  return { ok: true, data: (await response.json()) as T };
}

export function fetchWalletBalance() {
  return makeAuthenticatedRequest<{
    balanceCents: number;
    balanceZar: string;
    isActive: boolean;
    transactions: WalletTransaction[];
  }>("/api/wallet/balance");
}

export function initiateTopUp(amountCents: number) {
  return makeAuthenticatedRequest<{
    checkoutUrl: string;
    transactionId: string;
    paystackReference: string;
  }>("/api/wallet/topup/initiate", {
    method: "POST",
    body: JSON.stringify({ amountCents }),
  });
}

export function makePayment(vendorId: string, servicePointId: string, amountCents: number, description: string) {
  return makeAuthenticatedRequest<{
    transactionId: string;
    newBalanceCents: number;
    newBalanceZar: string;
  }>("/api/wallet/pay", {
    method: "POST",
    body: JSON.stringify({ vendorId, servicePointId, amountCents, description }),
  });
}
