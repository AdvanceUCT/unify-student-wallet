import { getStoredCredentials } from "@/src/features/wallet/holderAgent";
import type { PaymentRecord, StoredCredential, WalletSummary } from "@/src/lib/api/types";

export async function getStudentCredential(): Promise<StoredCredential | null> {
  const stored = await getStoredCredentials();
  return stored[0] ?? null;
}

export async function getWalletSummary(): Promise<WalletSummary> {
  return null;
}

export async function getPaymentHistory(): Promise<PaymentRecord[]> {
  return [];
}
