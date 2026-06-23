export type ApiPostResult<T> =
  | { data: T; status: "ok" }
  | { error: string; status: "error" }
  | { status: "unavailable" };

function trimmedBaseUrl(value: string | undefined) {
  const configuredBaseUrl = value?.trim();

  if (!configuredBaseUrl) {
    return null;
  }

  return configuredBaseUrl.replace(/\/+$/, "");
}

function getApiBaseUrl() {
  return trimmedBaseUrl(process.env.EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL) ?? "http://localhost:3002";
}

function apiErrorMessage(value: unknown, fallback: string) {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    value.error &&
    typeof value.error === "object" &&
    "message" in value.error &&
    typeof value.error.message === "string"
  ) {
    return value.error.message;
  }

  return fallback;
}

async function post<T>(path: string, body: object): Promise<ApiPostResult<T>> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl || typeof fetch !== "function") {
    return { status: "unavailable" };
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        error: apiErrorMessage(responseBody, `Request to ${path} failed with status ${response.status}.`),
        status: "error",
      };
    }

    return { data: responseBody as T, status: "ok" };
  } catch {
    return { status: "unavailable" };
  }
}

export const apiClient = { post };
