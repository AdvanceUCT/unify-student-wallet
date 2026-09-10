/**
 * @fileoverview JSON transports for the Credo agent and the portal-hosted payment API.
 * @module lib/api/apiClient
 */

import * as Crypto from "expo-crypto";

import {
  clearPaymentSession,
  loadPaymentDeviceId,
  loadPaymentSession,
  savePaymentSession,
  type PaymentSession,
} from "@/src/features/payment/paymentSession";

const DEFAULT_TIMEOUT_MS = 10_000;
const SAFE_READ_RETRY_DELAYS_MS = [250, 750] as const;

export type ApiErrorKind = "auth" | "cancelled" | "configuration" | "http" | "network" | "timeout";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status?: number,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type RequestOptions = {
  accessToken?: string;
  body?: object;
  method: "GET" | "POST";
  signal?: AbortSignal;
  timeoutMs?: number;
};

type TransportConfig = {
  baseUrl: () => string;
  networkErrorMessage: string;
  onUnauthorized?: () => Promise<void>;
  retrySafeReads?: boolean;
  timeoutErrorMessage: string;
};

function getAgentApiBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL?.trim();
  return (configuredBaseUrl || "http://localhost:3002").replace(/\/+$/, "");
}

function getPaymentApiBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_UNIFY_PAYMENT_API_BASE_URL?.trim();
  if (!configuredBaseUrl) {
    throw new ApiClientError(
      "The payment API is not configured.",
      "configuration",
      undefined,
      "PAYMENT_API_NOT_CONFIGURED",
    );
  }
  return configuredBaseUrl.replace(/\/+$/, "");
}

function requestUrl(baseUrl: string, path: string) {
  if (!/^\/(?!\/)/.test(path) || path.includes("\\")) {
    throw new ApiClientError(
      "API request paths must be relative to the configured service.",
      "configuration",
      undefined,
      "INVALID_API_PATH",
    );
  }
  return `${baseUrl}${path}`;
}

function responseError(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "error" in value && value.error && typeof value.error === "object") {
    const error = value.error as { code?: unknown; message?: unknown; requestId?: unknown };
    return {
      code: typeof error.code === "string" ? error.code : undefined,
      message: typeof error.message === "string" ? error.message : fallback,
      requestId: typeof error.requestId === "string" ? error.requestId : undefined,
    };
  }

  return { message: fallback };
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function waitForRetry(ms: number, signal: AbortSignal | undefined, requestId: string) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiClientError("The request was cancelled.", "cancelled", undefined, undefined, requestId));
      return;
    }

    const finish = () => {
      signal?.removeEventListener("abort", cancel);
      resolve();
    };
    const timeout = setTimeout(finish, ms);
    const cancel = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", cancel);
      reject(new ApiClientError("The request was cancelled.", "cancelled", undefined, undefined, requestId));
    };
    signal?.addEventListener("abort", cancel, { once: true });
  });
}

async function request<T>(config: TransportConfig, path: string, options: RequestOptions): Promise<T> {
  const url = requestUrl(config.baseUrl(), path);
  const requestId = Crypto.randomUUID();
  const retryDelays = config.retrySafeReads && options.method === "GET" ? SAFE_READ_RETRY_DELAYS_MS : [];

  if (options.signal?.aborted) {
    throw new ApiClientError("The request was cancelled.", "cancelled", undefined, undefined, requestId);
  }

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const cancel = () => controller.abort();
    options.signal?.addEventListener("abort", cancel, { once: true });

    try {
      const response = await fetch(url, {
        body: options.body ? JSON.stringify(options.body) : undefined,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
          "X-Request-ID": requestId,
        },
        method: options.method,
        signal: controller.signal,
      });

      if (attempt < retryDelays.length && isRetryableStatus(response.status)) {
        clearTimeout(timeout);
        await waitForRetry(retryDelays[attempt], options.signal, requestId);
        continue;
      }

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const error = responseError(body, `Request failed with status ${response.status}.`);
        const responseRequestId = response.headers?.get?.("x-request-id") ?? error.requestId ?? requestId;
        if (response.status === 401 && config.onUnauthorized) {
          await config.onUnauthorized();
          throw new ApiClientError(
            error.message,
            "auth",
            response.status,
            error.code ?? "PAYMENT_SESSION_UNAUTHORIZED",
            responseRequestId,
          );
        }
        throw new ApiClientError(error.message, "http", response.status, error.code, responseRequestId);
      }

      return body as T;
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      if (options.signal?.aborted) {
        throw new ApiClientError("The request was cancelled.", "cancelled", undefined, undefined, requestId);
      }
      if (timedOut) {
        if (attempt < retryDelays.length) {
          clearTimeout(timeout);
          await waitForRetry(retryDelays[attempt], options.signal, requestId);
          continue;
        }
        throw new ApiClientError(config.timeoutErrorMessage, "timeout", undefined, undefined, requestId);
      }
      if (attempt < retryDelays.length) {
        clearTimeout(timeout);
        await waitForRetry(retryDelays[attempt], options.signal, requestId);
        continue;
      }
      throw new ApiClientError(config.networkErrorMessage, "network", undefined, undefined, requestId);
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", cancel);
    }
  }

  throw new ApiClientError(config.networkErrorMessage, "network", undefined, undefined, requestId);
}

const agentTransport: TransportConfig = {
  baseUrl: getAgentApiBaseUrl,
  networkErrorMessage: "The verification service is unavailable.",
  timeoutErrorMessage: "The verification service timed out.",
};

const paymentTransport: TransportConfig = {
  baseUrl: getPaymentApiBaseUrl,
  networkErrorMessage: "The payment service is unavailable.",
  retrySafeReads: true,
  timeoutErrorMessage: "The payment service timed out.",
};

const paymentRefreshTransport: TransportConfig = {
  baseUrl: getPaymentApiBaseUrl,
  networkErrorMessage: "The payment service is unavailable.",
  timeoutErrorMessage: "The payment service timed out.",
};

let paymentRefreshPromise: Promise<PaymentSession> | null = null;

async function paymentAccessToken() {
  const session = await loadPaymentSession({ allowExpired: true });
  if (!session) {
    throw new ApiClientError(
      "Payment wallet activation is required.",
      "auth",
      undefined,
      "PAYMENT_SESSION_REQUIRED",
    );
  }
  return session.accessToken;
}

function sessionFromRefreshResponse(value: unknown): PaymentSession {
  const response = value as {
    accessToken?: unknown;
    accessExpiresAt?: unknown;
    refreshToken?: unknown;
    refreshExpiresAt?: unknown;
    sessionId?: unknown;
  };
  const session = {
    accessToken: typeof response.accessToken === "string" ? response.accessToken : "",
    accessExpiresAt: typeof response.accessExpiresAt === "string" ? response.accessExpiresAt : "",
    refreshToken: typeof response.refreshToken === "string" ? response.refreshToken : "",
    refreshExpiresAt: typeof response.refreshExpiresAt === "string" ? response.refreshExpiresAt : "",
    sessionId: typeof response.sessionId === "string" ? response.sessionId : "",
  };
  if (
    !session.accessToken ||
    !session.accessExpiresAt ||
    !session.refreshToken ||
    !session.refreshExpiresAt ||
    !session.sessionId ||
    !Number.isFinite(Date.parse(session.accessExpiresAt)) ||
    !Number.isFinite(Date.parse(session.refreshExpiresAt))
  ) {
    throw new ApiClientError(
      "The payment service returned an invalid session.",
      "http",
      502,
      "INVALID_PAYMENT_SESSION",
    );
  }
  return session;
}

async function refreshPaymentSession() {
  if (paymentRefreshPromise) return paymentRefreshPromise;

  paymentRefreshPromise = (async () => {
    const current = await loadPaymentSession({ allowExpired: true });
    const deviceId = await loadPaymentDeviceId();
    if (!current || !deviceId) {
      await clearPaymentSession();
      throw new ApiClientError(
        "Payment wallet activation is required.",
        "auth",
        undefined,
        "PAYMENT_SESSION_REQUIRED",
      );
    }

    try {
      const response = await request<unknown>(
        paymentRefreshTransport,
        "/api/wallet/v1/sessions/refresh",
        {
          body: { refreshToken: current.refreshToken, sessionId: current.sessionId, deviceId },
          method: "POST",
        },
      );
      const next = sessionFromRefreshResponse(response);
      await savePaymentSession(next);
      return next;
    } catch (error) {
      await clearPaymentSession();
      throw error;
    } finally {
      paymentRefreshPromise = null;
    }
  })();

  return paymentRefreshPromise;
}

async function paymentAuthenticatedRequest<T>(
  method: "GET" | "POST",
  path: string,
  options: { body?: object; signal?: AbortSignal; timeoutMs?: number } = {},
) {
  const run = async (accessToken: string) => request<T>(paymentTransport, path, {
    accessToken,
    body: options.body,
    method,
    signal: options.signal,
    timeoutMs: options.timeoutMs,
  });

  try {
    return await run(await paymentAccessToken());
  } catch (error) {
    if (
      error instanceof ApiClientError &&
      error.status === 401 &&
      !options.signal?.aborted
    ) {
      const refreshed = await refreshPaymentSession();
      return run(refreshed.accessToken);
    }
    throw error;
  }
}

export const apiClient = {
  get<T>(path: string, options: { resultToken: string; signal?: AbortSignal; timeoutMs?: number }) {
    return request<T>(agentTransport, path, {
      accessToken: options.resultToken,
      method: "GET",
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
  },
  post<T>(path: string, body: object, options: { signal?: AbortSignal; timeoutMs?: number } = {}) {
    return request<T>(agentTransport, path, { ...options, body, method: "POST" });
  },
};

export const paymentApiClient = {
  async get<T>(path: string, options: { signal?: AbortSignal; timeoutMs?: number } = {}) {
    return paymentAuthenticatedRequest<T>("GET", path, options);
  },
  async post<T>(path: string, body: object, options: { signal?: AbortSignal; timeoutMs?: number } = {}) {
    return paymentAuthenticatedRequest<T>("POST", path, { ...options, body });
  },
};

export const paymentPublicApiClient = {
  async post<T>(path: string, body: object, options: { signal?: AbortSignal; timeoutMs?: number } = {}) {
    return request<T>(paymentRefreshTransport, path, { ...options, body, method: "POST" });
  },
};
