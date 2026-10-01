import { ApiClientError, paymentApiClient, paymentPublicApiClient } from "@/src/lib/api/apiClient";
import {
  createTopUp,
  getTopUp,
  getWalletBalance,
  requestPaymentActivation,
  resolvePaymentDestination,
  revokePaymentActivation,
  submitPayment,
  verifyPaymentActivation,
} from "@/src/features/payment/paymentApi";
import { paymentFailure } from "@/src/features/payment/paymentErrors";

jest.mock("@/src/lib/api/apiClient", () => {
  const actual = jest.requireActual("@/src/lib/api/apiClient");
  return {
    ...actual,
    paymentApiClient: { get: jest.fn(), post: jest.fn() },
    paymentPublicApiClient: { post: jest.fn() },
  };
});

describe("payment API contract", () => {
  beforeEach(() => jest.clearAllMocks());

  it("preserves server OTP expiry and resend timing", async () => {
    const challenge = { challengeId: "challenge-001", expiresAt: "2099-01-01T00:10:00.000Z", resendAvailableAt: "2099-01-01T00:01:00.000Z", destinationHint: "university email on record" };
    jest.mocked(paymentPublicApiClient.post).mockResolvedValueOnce(challenge);
    await expect(requestPaymentActivation({ studentNumber: "ABC123", deviceId: "device-001" })).resolves.toEqual(challenge);
    jest.mocked(paymentPublicApiClient.post).mockResolvedValueOnce({ ...challenge, resendAvailableAt: "invalid" });
    await expect(requestPaymentActivation({ studentNumber: "ABC123", deviceId: "device-001" })).rejects.toThrow();
  });

  it("rejects static resolution and payment without sending a request", async () => {
    await expect(resolvePaymentDestination("branch_qr-001")).rejects.toMatchObject({ status: 410, code: "STATIC_PAYMENT_REMOVED" });
    await expect(submitPayment({ qrIdentifier: "branch_qr-001", amountMinor: 4575, idempotencyKey: "payment-request-001" })).rejects.toMatchObject({ status: 410, code: "STATIC_PAYMENT_REMOVED" });
    expect(paymentApiClient.get).not.toHaveBeenCalled();
    expect(paymentApiClient.post).not.toHaveBeenCalled();
  });

  it("requests and verifies payment activation with the public endpoints", async () => {
    jest.mocked(paymentPublicApiClient.post)
      .mockResolvedValueOnce({ challengeId: "challenge-001" })
      .mockResolvedValueOnce({
        accessToken: "access-token",
        accessExpiresAt: "2099-01-01T00:15:00.000Z",
        refreshToken: "refresh-token",
        refreshExpiresAt: "2099-01-31T00:00:00.000Z",
        sessionId: "session-001",
      });

    await expect(requestPaymentActivation({
      studentNumber: "ABC123",
      deviceId: "device-001",
    })).resolves.toEqual({ challengeId: "challenge-001" });
    expect(paymentPublicApiClient.post).toHaveBeenNthCalledWith(
      1,
      "/api/wallet/v1/activations/request",
      { studentNumber: "ABC123", deviceId: "device-001" },
      { signal: undefined },
    );

    await expect(verifyPaymentActivation({
      challengeId: "challenge-001",
      otp: "123456",
      deviceId: "device-001",
    })).resolves.toMatchObject({ sessionId: "session-001" });
    expect(paymentPublicApiClient.post).toHaveBeenNthCalledWith(
      2,
      "/api/wallet/v1/activations/verify",
      { challengeId: "challenge-001", otp: "123456", deviceId: "device-001" },
      { signal: undefined },
    );
  });

  it("creates and polls a hosted top-up without accepting callback success", async () => {
    const topUp = {
      topUpId: "topup-001",
      reference: "PSK_ref_001",
      status: "PENDING" as const,
      authorizationUrl: "https://checkout.paystack.test/pay/abc",
      amountMinor: 4575,
      currency: "ZAR" as const,
    };
    jest.mocked(paymentApiClient.post).mockResolvedValueOnce(topUp);
    jest.mocked(paymentApiClient.get).mockResolvedValueOnce({
      ...topUp,
      status: "SUCCEEDED" as const,
      completedAt: "2026-09-10T03:10:00.000Z",
      transactionId: "wallet-txn-001",
      resultingBalanceMinor: 14575,
    });

    await expect(createTopUp({
      amountMinor: 4575,
      currency: "ZAR",
      idempotencyKey: "topup-request-001",
    })).resolves.toEqual(topUp);
    expect(paymentApiClient.post).toHaveBeenCalledWith(
      "/api/wallet/v1/topups",
      { amountMinor: 4575, currency: "ZAR", idempotencyKey: "topup-request-001" },
      { signal: undefined },
    );

    await expect(getTopUp("topup-001")).resolves.toMatchObject({ status: "SUCCEEDED" });
    expect(paymentApiClient.get).toHaveBeenCalledWith(
      "/api/wallet/v1/topups/topup-001",
      { signal: undefined },
    );
  });

  it("preserves an ambiguous initialization as UNKNOWN without requiring a checkout URL", async () => {
    const unknownTopUp = {
      topUpId: "topup-unknown",
      reference: "unify-wlt-unknown",
      status: "UNKNOWN" as const,
      amountMinor: 4575,
      currency: "ZAR" as const,
    };
    jest.mocked(paymentApiClient.post).mockResolvedValueOnce(unknownTopUp);

    await expect(createTopUp({
      amountMinor: 4575,
      currency: "ZAR",
      idempotencyKey: "topup-request-unknown",
    })).resolves.toEqual(unknownTopUp);
  });

  it("uses the corrected session revoke endpoint", async () => {
    jest.mocked(paymentApiClient.post).mockResolvedValueOnce({});

    await expect(revokePaymentActivation()).resolves.toBeUndefined();
    expect(paymentApiClient.post).toHaveBeenCalledWith(
      "/api/wallet/v1/sessions/revoke",
      {},
      { signal: undefined },
    );
  });

  it("rejects malformed service responses", async () => {
    jest.mocked(paymentApiClient.get).mockResolvedValueOnce({ vendorName: "Injected", currency: "USD" });
    await expect(getWalletBalance()).rejects.toMatchObject({
      code: "INVALID_PAYMENT_RESPONSE",
    });
  });

  it("distinguishes confirmed rejection from an uncertain timeout", () => {
    expect(paymentFailure(new ApiClientError("low", "http", 409, "INSUFFICIENT_FUNDS"))).toMatchObject({
      title: "Not enough balance",
      outcomeUnknown: false,
    });
    expect(paymentFailure(new ApiClientError("timed out", "timeout", undefined, undefined, "request-001"))).toMatchObject({
      title: "Payment not confirmed",
      outcomeUnknown: true,
      requestId: "request-001",
    });
  });
});
