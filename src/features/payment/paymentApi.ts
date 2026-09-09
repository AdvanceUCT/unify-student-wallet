/**
 * @fileoverview Defines the student wallet's typed payment API contract.
 * @module features/payment/paymentApi
 */

import { z } from "zod";

import { paymentApiClient, ApiClientError } from "@/src/lib/api/apiClient";
import { isPaymentQrIdentifier } from "@/src/lib/validation/qrPayload";

const paymentDestinationSchema = z.object({
  vendorName: z.string().trim().min(1),
  branchName: z.string().trim().min(1),
  currency: z.literal("ZAR"),
});

const paymentReceiptSchema = paymentDestinationSchema.extend({
  transactionId: z.string().trim().min(1),
  amountMinor: z.number().int().positive().safe(),
  resultingBalanceMinor: z.number().int().nonnegative().safe(),
  completedAt: z.string().trim().min(1).refine((value) => Number.isFinite(Date.parse(value))),
  status: z.literal("COMPLETED"),
});

export type PaymentDestination = z.infer<typeof paymentDestinationSchema>;
export type PaymentReceipt = z.infer<typeof paymentReceiptSchema>;

export type SubmitPaymentInput = {
  qrIdentifier: string;
  amountMinor: number;
  idempotencyKey: string;
};

function invalidContract(message: string, code: string) {
  return new ApiClientError(message, "configuration", undefined, code);
}

function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiClientError(
      "The payment service returned an invalid response.",
      "http",
      502,
      "INVALID_PAYMENT_RESPONSE",
    );
  }
  return result.data;
}

export async function resolvePaymentDestination(qrIdentifier: string, signal?: AbortSignal) {
  if (!isPaymentQrIdentifier(qrIdentifier)) {
    throw invalidContract("This payment QR code is invalid.", "INVALID_PAYMENT_QR");
  }

  const response = await paymentApiClient.get<unknown>(
    `/api/wallet/v1/vendors/${encodeURIComponent(qrIdentifier)}`,
    { signal },
  );
  return parseResponse(paymentDestinationSchema, response);
}

export async function submitPayment(input: SubmitPaymentInput, signal?: AbortSignal) {
  if (!isPaymentQrIdentifier(input.qrIdentifier)) {
    throw invalidContract("This payment QR code is invalid.", "INVALID_PAYMENT_QR");
  }
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw invalidContract("The payment amount is invalid.", "INVALID_AMOUNT");
  }
  if (!input.idempotencyKey.trim()) {
    throw invalidContract("The payment request reference is missing.", "INVALID_IDEMPOTENCY_KEY");
  }

  const response = await paymentApiClient.post<unknown>("/api/wallet/v1/payments", input, { signal });
  return parseResponse(paymentReceiptSchema, response);
}
