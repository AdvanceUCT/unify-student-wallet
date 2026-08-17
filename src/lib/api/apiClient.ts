/**
 * @fileoverview Selects the mock or network API implementation from runtime configuration.
 * @module lib/api/apiClient
 */

import * as Crypto from "expo-crypto";

const DEFAULT_TIMEOUT_MS = 10_000;

export type ApiErrorKind = "cancelled" | "http" | "network" | "timeout";

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

function getApiBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL?.trim();
  return (configuredBaseUrl || "http://localhost:3002").replace(/\/+$/, "");
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

async function request<T>(
  path: string,
  options: {
    body?: object;
    method: "GET" | "POST";
    resultToken?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
  },
): Promise<T> {
  const controller = new AbortController();
  const requestId = Crypto.randomUUID();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel, { once: true });

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.resultToken ? { Authorization: `Bearer ${options.resultToken}` } : {}),
        "X-Request-ID": requestId,
      },
      method: options.method,
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const error = responseError(body, `Request failed with status ${response.status}.`);
      const responseRequestId = response.headers?.get?.("x-request-id") ?? error.requestId ?? requestId;
      throw new ApiClientError(error.message, "http", response.status, error.code, responseRequestId);
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (timedOut) throw new ApiClientError("The verification service timed out.", "timeout", undefined, undefined, requestId);
    if (options.signal?.aborted) throw new ApiClientError("The request was cancelled.", "cancelled", undefined, undefined, requestId);
    throw new ApiClientError("The verification service is unavailable.", "network", undefined, undefined, requestId);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancel);
  }
}

export const apiClient = {
  get<T>(path: string, options: { resultToken?: string; signal?: AbortSignal; timeoutMs?: number } = {}) {
    return request<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, body: object, options: { signal?: AbortSignal; timeoutMs?: number } = {}) {
    return request<T>(path, { ...options, body, method: "POST" });
  },
};
