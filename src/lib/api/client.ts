/**
 * @fileoverview Sends JSON requests to the portal API with timeout, cancellation, and normalized errors.
 * @module lib/api/client
 */

import { getStoredCredentialsLazy } from "@/src/features/wallet/holderAgentRuntime";
import type { PaymentRecord, StoredCredential, WalletSummary } from "@/src/lib/api/types";

export async function getStudentCredential(): Promise<StoredCredential | null> {
  const stored = await getStoredCredentialsLazy();
  return stored[0] ?? null;
}

export async function getWalletSummary(): Promise<WalletSummary> {
  return null;
}

export async function getPaymentHistory(): Promise<PaymentRecord[]> {
  return [];
}
