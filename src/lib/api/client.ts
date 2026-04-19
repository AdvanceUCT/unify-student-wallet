import { mockPaymentHistory, mockStudentCredential, mockWalletSummary } from "@/src/lib/api/mockStudent";

const wait = (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs));

export async function getStudentCredential() {
  await wait(150);
  return mockStudentCredential;
}

export async function getWalletSummary() {
  await wait(150);
  return mockWalletSummary;
}

export async function getPaymentHistory() {
  await wait(150);
  return mockPaymentHistory;
}
