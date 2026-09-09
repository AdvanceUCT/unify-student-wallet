import { ApiClientError, paymentApiClient } from "@/src/lib/api/apiClient";
import { resolvePaymentDestination, submitPayment } from "@/src/features/payment/paymentApi";
import { paymentFailure } from "@/src/features/payment/paymentErrors";

jest.mock("@/src/lib/api/apiClient", () => {
  const actual = jest.requireActual("@/src/lib/api/apiClient");
  return {
    ...actual,
    paymentApiClient: { get: jest.fn(), post: jest.fn() },
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
