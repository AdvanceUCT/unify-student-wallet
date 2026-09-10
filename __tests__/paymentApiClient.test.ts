import {
  clearPaymentSession,
  loadPaymentDeviceId,
  loadPaymentSession,
  savePaymentSession,
} from "@/src/features/payment/paymentSession";
import { ApiClientError, paymentApiClient } from "@/src/lib/api/apiClient";

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "payment-request-001"),
}));

jest.mock("@/src/features/payment/paymentSession", () => ({
  clearPaymentSession: jest.fn(),
  loadPaymentDeviceId: jest.fn(),
  loadPaymentSession: jest.fn(),
  savePaymentSession: jest.fn(),
}));

const originalFetch = global.fetch;
const originalPaymentApiBaseUrl = process.env.EXPO_PUBLIC_UNIFY_PAYMENT_API_BASE_URL;

function mockResponse(body: object, status = 200, requestId?: string) {
  return {
    headers: { get: jest.fn(() => requestId ?? null) },
    json: jest.fn(async () => body),
    ok: status >= 200 && status < 300,
    status,
  } as unknown as Response;
}

describe("payment API client", () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_UNIFY_PAYMENT_API_BASE_URL = "https://portal.example/";
    jest.mocked(loadPaymentSession).mockResolvedValue({
      accessToken: "payment-token",
      accessExpiresAt: "2099-01-01T00:00:00.000Z",
      refreshToken: "payment-refresh-token",
      refreshExpiresAt: "2099-01-02T00:00:00.000Z",
      sessionId: "session-001",
    });
    jest.mocked(loadPaymentDeviceId).mockResolvedValue("device-001");
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_UNIFY_PAYMENT_API_BASE_URL = originalPaymentApiBaseUrl;
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("uses the payment origin, bearer session, and correlation header", async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce(mockResponse({ balanceMinor: 5000 }));

    await expect(paymentApiClient.get("/api/wallet/balance")).resolves.toEqual({ balanceMinor: 5000 });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://portal.example/api/wallet/balance",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer payment-token",
          "X-Request-ID": expect.any(String),
        }),
        method: "GET",
      }),
    );
  });

  it("fails before fetch when the payment URL is missing", async () => {
    delete process.env.EXPO_PUBLIC_UNIFY_PAYMENT_API_BASE_URL;

    await expect(paymentApiClient.get("/api/wallet/balance")).rejects.toMatchObject({
      code: "PAYMENT_API_NOT_CONFIGURED",
      kind: "configuration",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fails before fetch when activation has not supplied a valid session", async () => {
    jest.mocked(loadPaymentSession).mockResolvedValueOnce(null);

    await expect(paymentApiClient.get("/api/wallet/balance")).rejects.toMatchObject({
      code: "PAYMENT_SESSION_REQUIRED",
      kind: "auth",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(["https://attacker.example/collect", "//attacker.example/collect", "/api\\collect"])(
    "rejects a path that could escape the configured origin: %s",
    async (path) => {
      await expect(paymentApiClient.get(path)).rejects.toMatchObject({ code: "INVALID_API_PATH" });
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it("retries transient GET responses twice with one request ID", async () => {
    jest.useFakeTimers();
    jest.mocked(global.fetch)
      .mockResolvedValueOnce(mockResponse({ error: { message: "busy" } }, 503))
      .mockResolvedValueOnce(mockResponse({ error: { message: "still busy" } }, 429))
      .mockResolvedValueOnce(mockResponse({ balanceMinor: 5000 }));

    const result = paymentApiClient.get<{ balanceMinor: number }>("/api/wallet/balance");
    await jest.advanceTimersByTimeAsync(1_000);

    await expect(result).resolves.toEqual({ balanceMinor: 5000 });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    const requestIds = jest.mocked(global.fetch).mock.calls.map(([, init]) =>
      (init?.headers as Record<string, string>)["X-Request-ID"],
    );
    expect(new Set(requestIds).size).toBe(1);
  });

  it("retries transient GET network failures", async () => {
    jest.useFakeTimers();
    jest.mocked(global.fetch)
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(mockResponse({ balanceMinor: 5000 }));

    const result = paymentApiClient.get<{ balanceMinor: number }>("/api/wallet/balance");
    await jest.advanceTimersByTimeAsync(1_000);

    await expect(result).resolves.toEqual({ balanceMinor: 5000 });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("stops retrying a GET after three timed-out attempts", async () => {
    jest.useFakeTimers();
    jest.mocked(global.fetch).mockImplementation(
      (_url, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    );

    const result = expect(
      paymentApiClient.get("/api/wallet/balance", { timeoutMs: 10 }),
    ).rejects.toMatchObject({ kind: "timeout" });
    await jest.advanceTimersByTimeAsync(1_100);

    await result;
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry POST requests", async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce(mockResponse({ error: { message: "busy" } }, 503));

    await expect(paymentApiClient.post("/api/wallet/payments", { amountMinor: 500 })).rejects.toMatchObject({
      kind: "http",
      status: 503,
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("refreshes once after an unauthorized payment response and retries the request", async () => {
    const refreshedSession = {
      accessToken: "fresh-payment-token",
      accessExpiresAt: "2099-01-01T00:15:00.000Z",
      refreshToken: "fresh-refresh-token",
      refreshExpiresAt: "2099-01-02T00:00:00.000Z",
      sessionId: "session-001",
    };
    jest.mocked(global.fetch)
      .mockResolvedValueOnce(mockResponse({ error: { message: "Session expired." } }, 401, "portal-request-401"))
      .mockResolvedValueOnce(mockResponse(refreshedSession))
      .mockResolvedValueOnce(mockResponse({ balanceMinor: 5000 }));

    await expect(paymentApiClient.get("/api/wallet/balance")).resolves.toEqual({ balanceMinor: 5000 });

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "https://portal.example/api/wallet/v1/sessions/refresh",
      expect.objectContaining({
        body: JSON.stringify({ refreshToken: "payment-refresh-token", sessionId: "session-001", deviceId: "device-001" }),
        method: "POST",
      }),
    );
    expect(savePaymentSession).toHaveBeenCalledWith(refreshedSession);
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      "https://portal.example/api/wallet/balance",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer fresh-payment-token" }),
      }),
    );
  });

  it("clears the local session when refresh cannot run", async () => {
    jest.mocked(loadPaymentDeviceId).mockResolvedValueOnce(null);
    jest.mocked(global.fetch).mockResolvedValueOnce(
      mockResponse({ error: { message: "Session expired." } }, 401, "portal-request-401"),
    );

    await expect(paymentApiClient.get("/api/wallet/balance")).rejects.toMatchObject({
      code: "PAYMENT_SESSION_REQUIRED",
      kind: "auth",
    });
    expect(clearPaymentSession).toHaveBeenCalledTimes(1);
  });

  it("does not clear a valid session for forbidden responses", async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce(mockResponse({ error: { message: "Forbidden." } }, 403));

    await expect(paymentApiClient.get("/api/wallet/balance")).rejects.toMatchObject({ kind: "http", status: 403 });
    expect(clearPaymentSession).not.toHaveBeenCalled();
  });

  it("cancels before sending when the caller signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(paymentApiClient.get("/api/wallet/balance", { signal: controller.signal })).rejects.toBeInstanceOf(
      ApiClientError,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
