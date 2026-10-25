import { z } from "zod";
import { paymentApiClient } from "@/src/lib/api/apiClient";
const base = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{32}$/), orderReference: z.string().min(1),
  branchId: z.string().min(1),
  vendorName: z.string().min(1), branchName: z.string().min(1), amountMinor: z.number().int().positive().safe(), currency: z.literal("ZAR"),
  expiresAt: z.string().datetime(),
});
const requestSchema = base.extend({ status: z.enum(["PENDING", "PAID", "CANCELLED", "EXPIRED"]) });
const receiptSchema = base.extend({ status: z.literal("COMPLETED"), transactionId: z.string().min(1), completedAt: z.string().datetime(), resultingBalanceMinor: z.number().int().nonnegative().safe() });
export type PosPaymentReceipt = z.infer<typeof receiptSchema>;
export function paymentRequestPath(id: string) {
  if (!/^[A-Za-z0-9_-]{32}$/.test(id)) throw new Error("Invalid payment request.");
  return `/api/wallet/v1/payment-requests/${id}`;
}
export async function resolvePaymentRequest(id: string, signal?: AbortSignal) { return requestSchema.parse(await paymentApiClient.get(paymentRequestPath(id), { signal })); }
export async function getPaymentRequestReceipt(id: string) { return receiptSchema.parse(await paymentApiClient.get(`${paymentRequestPath(id)}/receipt`)); }
export async function payRequest(id: string, idempotencyKey: string) { return receiptSchema.parse(await paymentApiClient.post(`${paymentRequestPath(id)}/pay`, { idempotencyKey })); }
