/**
 * @fileoverview Maps payment transport and domain errors to student-facing recovery guidance.
 * @module features/payment/paymentErrors
 */

import { ApiClientError } from "@/src/lib/api/apiClient";

export type PaymentFailure = {
  title: string;
  message: string;
  requestId?: string;
  outcomeUnknown: boolean;
};

const KNOWN_FAILURES: Record<string, Omit<PaymentFailure, "requestId" | "outcomeUnknown">> = {
  ACCOUNT_SUSPENDED: {
    title: "Wallet suspended",
    message: "Your payment wallet is suspended. Contact your institution for help. No payment was made.",
  },
  BRANCH_NOT_PAYMENT_ENABLED: {
    title: "Vendor unavailable",
    message: "This branch cannot accept wallet payments right now. No payment was made.",
  },
  IDEMPOTENCY_CONFLICT: {
    title: "Start this payment again",
    message: "The payment details changed after this request began. Go back and start a new payment.",
  },
  INSUFFICIENT_FUNDS: {
    title: "Not enough balance",
    message: "Top up your wallet or go back and enter a smaller amount. No payment was made.",
  },
  INVALID_AMOUNT: {
    title: "Check the amount",
    message: "Go back and enter a valid payment amount.",
  },
  INVALID_PAYMENT_OTP: {
    title: "Check the code",
    message: "Enter the latest 6-digit code sent to your student email.",
  },
  INVALID_PAYMENT_QR: {
    title: "Payment QR not recognised",
    message: "Return to the scanner and scan the vendor's current UNIFY payment QR.",
  },
  INVALID_STUDENT_NUMBER: {
    title: "Check student number",
    message: "Enter the student number linked to your institution record.",
  },
  PAYSTACK_CHECKOUT_FAILED: {
    title: "Top-up failed",
    message: "Paystack did not confirm this top-up. No wallet credit was posted.",
  },
  TOPUP_FAILED: {
    title: "Top-up failed",
    message: "No wallet credit was posted. You can start a new top-up with a new reference.",
  },
  PAYMENT_SESSION_REQUIRED: {
    title: "Payment activation required",
    message: "Activate your payment wallet before trying this payment.",
  },
  INVALID_WALLET_SESSION: {
    title: "Payment activation expired",
    message: "Activate payments again before continuing.",
  },
  PAYMENT_WALLET_NOT_ELIGIBLE: {
    title: "Credential required",
    message: "Accept your active student credential before activating payments.",
  },
  RATE_LIMITED: {
    title: "Try again shortly",
    message: "Wait before requesting another activation code.",
  },
  PAYMENT_SESSION_UNAUTHORIZED: {
    title: "Payment session expired",
    message: "Reactivate your payment wallet before trying this payment again.",
  },
  PAYMENT_WALLET_DISABLED: {
    title: "Payments unavailable",
    message: "Wallet payments are temporarily unavailable. No payment was made.",
  },
  VENDOR_NOT_PAYMENT_ENABLED: {
    title: "Vendor unavailable",
    message: "This vendor cannot accept wallet payments right now. No payment was made.",
  },
};

export function paymentFailure(error: unknown): PaymentFailure {
  if (error instanceof ApiClientError) {
    const known = error.code ? KNOWN_FAILURES[error.code] : undefined;
    if (known) return { ...known, requestId: error.requestId, outcomeUnknown: false };

    if (error.kind === "network" || error.kind === "timeout" || (error.status !== undefined && error.status >= 500)) {
      return {
        title: "Payment not confirmed",
        message: "We could not confirm the outcome. Reconnect and retry; this payment will reuse the same request reference.",
        requestId: error.requestId,
        outcomeUnknown: true,
      };
    }

    return {
      title: "Payment could not be completed",
      message: error.message || "Review the payment details and try again.",
      requestId: error.requestId,
      outcomeUnknown: false,
    };
  }

  return {
    title: "Payment not confirmed",
    message: "We could not confirm the outcome. Retry this payment using the same request reference.",
    outcomeUnknown: true,
  };
}
