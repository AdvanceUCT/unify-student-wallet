/**
 * @fileoverview Defines the student wallet's typed payment API contract.
 * @module features/payment/paymentApi
 */

import { z } from "zod";

import { paymentApiClient, paymentPublicApiClient, ApiClientError } from "@/src/lib/api/apiClient";
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

const paymentSessionResponseSchema = z.object({
  accessToken: z.string().trim().min(1),
  accessExpiresAt: z.string().trim().min(1),
  refreshToken: z.string().trim().min(1),
  refreshExpiresAt: z.string().trim().min(1),
  sessionId: z.string().trim().min(1),
}).refine((value) => Number.isFinite(Date.parse(value.accessExpiresAt)), {
  message: "Payment access expiry is invalid.",
}).refine((value) => Number.isFinite(Date.parse(value.refreshExpiresAt)), {
  message: "Payment refresh expiry is invalid.",
});

const activationChallengeSchema = z.object({
  challengeId: z.string().trim().min(1),
  expiresAt: z.string().trim().min(1).optional(),
}).refine((value) => !value.expiresAt || Number.isFinite(Date.parse(value.expiresAt)), {
  message: "Payment activation expiry is invalid.",
});

const TOP_UP_STATUS = z.enum(["PENDING", "SUCCEEDED", "FAILED", "UNKNOWN"]);
const topUpStatusShape = {
  topUpId: z.string().trim().min(1),
  reference: z.string().trim().min(1).optional(),
  status: TOP_UP_STATUS,
  amountMinor: z.number().int().positive().safe().optional(),
  currency: z.literal("ZAR").optional(),
  completedAt: z.string().trim().min(1).optional(),
  transactionId: z.string().trim().min(1).optional(),
  resultingBalanceMinor: z.number().int().nonnegative().safe().optional(),
  failureCode: z.string().trim().min(1).optional(),
};
const topUpStatusSchema = z.object(topUpStatusShape).refine((value) => !value.completedAt || Number.isFinite(Date.parse(value.completedAt)), {
  message: "Top-up completion time is invalid.",
});

const pendingTopUpResponseSchema = z.object({
  ...topUpStatusShape,
  reference: z.string().trim().min(1),
  authorizationUrl: z.string().trim().url().refine((value) => new URL(value).protocol === "https:", {
    message: "Top-up checkout URL must use HTTPS.",
  }),
  amountMinor: z.number().int().positive().safe(),
  currency: z.literal("ZAR"),
  status: z.literal("PENDING"),
});
const unknownTopUpResponseSchema = z.object({
  ...topUpStatusShape,
  reference: z.string().trim().min(1),
  amountMinor: z.number().int().positive().safe(),
  currency: z.literal("ZAR"),
  status: z.literal("UNKNOWN"),
});
const createTopUpResponseSchema = z.discriminatedUnion("status", [
  pendingTopUpResponseSchema,
  unknownTopUpResponseSchema,
]).refine((value) => !value.completedAt || Number.isFinite(Date.parse(value.completedAt)), {
  message: "Top-up completion time is invalid.",
});

export type PaymentDestination = z.infer<typeof paymentDestinationSchema>;
export type PaymentReceipt = z.infer<typeof paymentReceiptSchema>;
export type PaymentActivationChallenge = z.infer<typeof activationChallengeSchema>;
export type PaymentSessionResponse = z.infer<typeof paymentSessionResponseSchema>;
export type TopUpStatus = z.infer<typeof topUpStatusSchema>;
export type CreateTopUpResponse = z.infer<typeof createTopUpResponseSchema>;

export type SubmitPaymentInput = {
  qrIdentifier: string;
  amountMinor: number;
  idempotencyKey: string;
};

export type CreateTopUpInput = {
  amountMinor: number;
  currency: "ZAR";
  idempotencyKey: string;
};

export const MIN_TOP_UP_MINOR = 1_000;
export const MAX_TOP_UP_MINOR = 500_000;

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

function validateDeviceId(deviceId: string) {
  if (!deviceId.trim()) {
    throw invalidContract("The payment device reference is missing.", "INVALID_PAYMENT_DEVICE");
  }
}

function validateTopUpAmount(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < MIN_TOP_UP_MINOR || amountMinor > MAX_TOP_UP_MINOR) {
    throw invalidContract("The top-up amount must be between R 10.00 and R 5 000.00.", "INVALID_AMOUNT");
  }
}

function validateIdempotencyKey(idempotencyKey: string) {
  if (!idempotencyKey.trim()) {
    throw invalidContract("The payment request reference is missing.", "INVALID_IDEMPOTENCY_KEY");
  }
}

export async function requestPaymentActivation(input: { studentNumber: string; deviceId: string }, signal?: AbortSignal) {
  const studentNumber = input.studentNumber.trim();
  validateDeviceId(input.deviceId);
  if (!studentNumber) {
    throw invalidContract("Enter your student number.", "INVALID_STUDENT_NUMBER");
  }

  const response = await paymentPublicApiClient.post<unknown>(
    "/api/wallet/v1/activations/request",
    { studentNumber, deviceId: input.deviceId },
    { signal },
  );
  return parseResponse(activationChallengeSchema, response);
}

export async function verifyPaymentActivation(
  input: { challengeId: string; otp: string; deviceId: string },
  signal?: AbortSignal,
) {
  validateDeviceId(input.deviceId);
  if (!input.challengeId.trim()) {
    throw invalidContract("The activation challenge is missing.", "INVALID_PAYMENT_CHALLENGE");
  }
  if (!/^\d{6}$/.test(input.otp.trim())) {
    throw invalidContract("Enter the 6-digit code.", "INVALID_PAYMENT_OTP");
  }

  const response = await paymentPublicApiClient.post<unknown>(
    "/api/wallet/v1/activations/verify",
    { challengeId: input.challengeId, otp: input.otp.trim(), deviceId: input.deviceId },
    { signal },
  );
  return parseResponse(paymentSessionResponseSchema, response);
}

export async function refreshPaymentActivation(
  input: { refreshToken: string; sessionId: string; deviceId: string },
  signal?: AbortSignal,
) {
  validateDeviceId(input.deviceId);
  if (!input.refreshToken.trim()) {
    throw invalidContract("The payment refresh token is missing.", "INVALID_PAYMENT_REFRESH");
  }
  if (!input.sessionId.trim()) {
    throw invalidContract("The payment session reference is missing.", "INVALID_PAYMENT_REFRESH");
  }

  const response = await paymentPublicApiClient.post<unknown>(
    "/api/wallet/v1/sessions/refresh",
    { refreshToken: input.refreshToken, sessionId: input.sessionId, deviceId: input.deviceId },
    { signal },
  );
  return parseResponse(paymentSessionResponseSchema, response);
}

export async function revokePaymentActivation(signal?: AbortSignal) {
  await paymentApiClient.post<unknown>("/api/wallet/v1/sessions/revoke", {}, { signal });
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
  validateIdempotencyKey(input.idempotencyKey);

  const response = await paymentApiClient.post<unknown>("/api/wallet/v1/payments", input, { signal });
  return parseResponse(paymentReceiptSchema, response);
}

export async function createTopUp(input: CreateTopUpInput, signal?: AbortSignal) {
  validateTopUpAmount(input.amountMinor);
  if (input.currency !== "ZAR") {
    throw invalidContract("Only ZAR top-ups are supported.", "INVALID_CURRENCY");
  }
  validateIdempotencyKey(input.idempotencyKey);

  const response = await paymentApiClient.post<unknown>("/api/wallet/v1/topups", input, { signal });
  return parseResponse(createTopUpResponseSchema, response);
}

export async function getTopUp(topUpId: string, signal?: AbortSignal) {
  if (!topUpId.trim()) {
    throw invalidContract("The top-up reference is missing.", "INVALID_TOPUP");
  }

  const response = await paymentApiClient.get<unknown>(
    `/api/wallet/v1/topups/${encodeURIComponent(topUpId)}`,
    { signal },
  );
  return parseResponse(topUpStatusSchema, response);
}

export async function reconcileTopUp(topUpId: string, signal?: AbortSignal) {
  if (!topUpId.trim()) {
    throw invalidContract("The top-up reference is missing.", "INVALID_TOPUP");
  }

  const response = await paymentApiClient.post<unknown>(
    `/api/wallet/v1/topups/${encodeURIComponent(topUpId)}/reconcile`,
    {},
    { signal },
  );
  return parseResponse(topUpStatusSchema, response);
}
