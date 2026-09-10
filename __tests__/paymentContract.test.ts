import { ApiClientError, paymentApiClient, paymentPublicApiClient } from "@/src/lib/api/apiClient";
import {
  createTopUp,
  getTopUp,
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

const destination = { vendorName: "Campus Coffee", branchName: "Main Library", currency: "ZAR" as const };

describe("payment API contract", () => {
  beforeEach(() => jest.clearAllMocks());

  it("resolves only server-owned display data for an opaque QR", async () => {
    jest.mocked(paymentApiClient.get).mockResolvedValueOnce(destination);

    await expect(resolvePaymentDestination("branch_qr-001")).resolves.toEqual(destination);
    expect(paymentApiClient.get).toHaveBeenCalledWith(
      "/api/wallet/v1/vendors/branch_qr-001",
      { signal: undefined },
    );
  });

  it("submits integer cents with the caller's idempotency key", async () => {
    const receipt = {
      ...destination,
      transactionId: "transaction-001",
      amountMinor: 4575,
      resultingBalanceMinor: 5425,
      completedAt: "2026-09-09T12:00:00.000Z",
      status: "COMPLETED" as const,
    };
    jest.mocked(paymentApiClient.post).mockResolvedValueOnce(receipt);

    await expect(submitPayment({
      qrIdentifier: "branch_qr-001",
      amountMinor: 4575,
      idempotencyKey: "payment-request-001",
    })).resolves.toEqual(receipt);
    expect(paymentApiClient.post).toHaveBeenCalledWith(
      "/api/wallet/v1/payments",
      { qrIdentifier: "branch_qr-001", amountMinor: 4575, idempotencyKey: "payment-request-001" },
      { signal: undefined },
    );
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
    await expect(resolvePaymentDestination("branch_qr-001")).rejects.toMatchObject({
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
