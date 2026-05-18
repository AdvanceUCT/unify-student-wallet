import type { ActivationLinkRequest } from "./activationLinks";

export type ResolvedWalletActivation = {
  activationId: string;
  activationSource: ActivationLinkRequest["kind"];
  createdAt: string;
  credentialExchangeId?: string;
  expiresAt?: string;
  invitationId: string;
  invitationUrl: string;
  issuerLabel: string;
};

export type ActivationResult<T> = { ok: true; data: T } | { ok: false; error: string };

type RemotePostResult<T> =
  | { data: T; status: "ok" }
  | { error: string; status: "error" }
  | { status: "unavailable" };

type RemoteResolveResponse = {
  activationId: string;
  activationSource?: "token";
  createdAt: string;
  credentialExchangeId?: string;
  expiresAt?: string;
  invitationId: string;
  invitationUrl: string;
  issuerLabel: string;
};

type ActivationApi = {
  resolvePath: string;
  serviceName: string;
  unavailableMessage: string;
  url: string;
};

function trimmedBaseUrl(value: string | undefined) {
  const configuredBaseUrl = value?.trim();

  if (!configuredBaseUrl) {
    return null;
  }

  return configuredBaseUrl.replace(/\/+$/, "");
}

function getActivationApi(): ActivationApi {
  const agentBaseUrl =
    trimmedBaseUrl(process.env.EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL) ?? "http://localhost:3002";

  return {
    resolvePath: "/api/wallet/activation/resolve",
    serviceName: "agent service",
    unavailableMessage:
      "Activation service is unavailable. Check that the Credo agent service is running and try again.",
    url: agentBaseUrl,
  };
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

async function postActivationApi<T>(api: ActivationApi, path: string, body: object): Promise<RemotePostResult<T>> {
  const baseUrl = api.url;

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
        error: apiErrorMessage(responseBody, `${api.serviceName} activation request failed with status ${response.status}.`),
        status: "error",
      };
    }

    return { data: responseBody as T, status: "ok" };
  } catch {
    return { status: "unavailable" };
  }
}

function suffixFor(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "oob";
}

/**
 * Turns an activation link payload into the issuer invitation the wallet can open.
 *
 * Token links go through the agent service, while direct OOB links are kept local
 * for development and QR testing.
 *
 * @param request - Parsed activation link data from the deep link or QR scanner.
 * @returns The resolved invitation details, or a user-facing error if resolution fails.
 */
export async function resolveWalletActivation(request: ActivationLinkRequest): Promise<ActivationResult<ResolvedWalletActivation>> {
  if (request.kind === "token") {
    const activationApi = getActivationApi();

    const remoteResult = await postActivationApi<RemoteResolveResponse>(activationApi, activationApi.resolvePath, {
      kind: "token",
      sourceUrl: request.sourceUrl,
      token: request.token,
    });

    if (remoteResult.status === "ok") {
      return {
        ok: true,
        data: {
          activationId: remoteResult.data.activationId,
          activationSource: "token",
          createdAt: remoteResult.data.createdAt,
          credentialExchangeId: remoteResult.data.credentialExchangeId,
          expiresAt: remoteResult.data.expiresAt,
          invitationId: remoteResult.data.invitationId,
          invitationUrl: remoteResult.data.invitationUrl,
          issuerLabel: remoteResult.data.issuerLabel,
        },
      };
    }

    if (remoteResult.status === "error") {
      return { ok: false, error: remoteResult.error };
    }

    return {
      ok: false,
      error: activationApi.unavailableMessage,
    };
  }

  return resolveLocalWalletActivation(request);
}

async function resolveLocalWalletActivation(
  request: ActivationLinkRequest,
): Promise<ActivationResult<ResolvedWalletActivation>> {
  if (request.kind !== "oob") {
    return {
      ok: false,
      error: "Token activations require the agent service. Please try again when it is reachable.",
    };
  }

  const suffix = suffixFor(request.invitationUrl);
  const invitationId = `unify-oob-${suffix}`;

  return {
    ok: true,
    data: {
      activationId: `activation-${suffix}`,
      activationSource: "oob",
      createdAt: new Date().toISOString(),
      invitationId,
      invitationUrl: request.invitationUrl,
      issuerLabel: "Issuer (out-of-band)",
    },
  };
}
