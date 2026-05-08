import { DEMO_STUDENT_ID, DEMO_WALLET_ID } from "./sessionTypes";
import type { ActivationLinkRequest } from "./activationLinks";

export type ResolvedWalletActivation = {
  activationId: string;
  activationSource: ActivationLinkRequest["kind"];
  createdAt: string;
  credentialExchangeId?: string;
  invitationId: string;
  invitationUrl: string;
  issuerLabel: string;
  ledgerName: "BCovrin Test";
  mediatorInvitationUrl?: string;
  studentId: string;
  walletId: string;
};

export type CompletedWalletActivation = {
  activationId: string;
  completedAt: string;
  credentialExchangeId?: string;
  credentialRecordId: string;
  holderConnectionId: string;
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
  ledger?: { name?: string };
  ledgerName?: "BCovrin Test";
  mediatorInvitationUrl?: string;
  studentId: string;
  walletId: string;
};

type RemoteCompleteResponse = {
  activatedAt?: string;
  activationId: string;
  completedAt?: string;
  credentialExchangeId?: string;
  credentialRecordId: string;
  holderConnectionId: string;
};

type ActivationApi = {
  completePath: string;
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

function getActivationApi(): ActivationApi | null {
  const agentBaseUrl = trimmedBaseUrl(process.env.EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL);

  if (agentBaseUrl) {
    return {
      completePath: "/api/wallet/activation/complete",
      resolvePath: "/api/wallet/activation/resolve",
      serviceName: "agent service",
      unavailableMessage: "Activation service is unavailable. Check that the Credo agent service is running and try again.",
      url: agentBaseUrl,
    };
  }

  const adminBaseUrl = trimmedBaseUrl(process.env.EXPO_PUBLIC_UNIFY_ADMIN_API_BASE_URL);

  if (adminBaseUrl) {
    return {
      completePath: "/api/mock/wallet/activation/complete",
      resolvePath: "/api/mock/wallet/activation/resolve",
      serviceName: "admin mock",
      unavailableMessage: "Activation service is unavailable. Check that the admin portal is running and try again.",
      url: adminBaseUrl,
    };
  }

  return null;
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
  return value.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "demo";
}

function base64UrlEncode(value: string) {
  const utf8Value = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_match, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );

  return btoa(utf8Value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function mockInvitationUrl(invitationId: string) {
  const invitation = {
    "@id": invitationId,
    "@type": "https://didcomm.org/out-of-band/1.1/invitation",
    "handshake_protocols": ["https://didcomm.org/didexchange/1.0"],
    label: "UNIFY Issuer Service",
    services: [
      {
        id: "#inline",
        recipientKeys: ["did:key:z6MkiTBzj1u3bdF7S7Q4TzqzH4Rb9SLGZwk9N4qe68q8nW1N"],
        routingKeys: [],
        serviceEndpoint: "https://issuer.advanceuct.test/didcomm",
        type: "did-communication",
      },
    ],
  };

  return `https://issuer.advanceuct.test/oob?oob=${base64UrlEncode(JSON.stringify(invitation))}`;
}

export async function resolveWalletActivation(request: ActivationLinkRequest): Promise<ActivationResult<ResolvedWalletActivation>> {
  if (request.kind === "token") {
    const activationApi = getActivationApi();

    if (!activationApi) {
      return {
        ok: false,
        error: "Activation service is unavailable. Configure EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL and try again.",
      };
    }

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
          invitationId: remoteResult.data.invitationId,
          invitationUrl: remoteResult.data.invitationUrl,
          issuerLabel: remoteResult.data.issuerLabel,
          ledgerName: remoteResult.data.ledgerName ?? "BCovrin Test",
          mediatorInvitationUrl: remoteResult.data.mediatorInvitationUrl,
          studentId: remoteResult.data.studentId,
          walletId: remoteResult.data.walletId,
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
  const seedValue = request.kind === "token" ? request.token : request.invitationUrl;
  const suffix = suffixFor(seedValue);
  const invitationId = `unify-oob-${suffix}`;

  return {
    ok: true,
    data: {
      activationId: `activation-${suffix}`,
      activationSource: request.kind,
      createdAt: new Date().toISOString(),
      invitationId,
      invitationUrl: request.kind === "oob" ? request.invitationUrl : mockInvitationUrl(invitationId),
      issuerLabel: "UNIFY Issuer Service",
      ledgerName: "BCovrin Test",
      studentId: DEMO_STUDENT_ID,
      walletId: DEMO_WALLET_ID,
    },
  };
}

export async function completeWalletActivation(
  activation: ResolvedWalletActivation,
  holderConnectionId: string,
  credentialRecordId: string,
): Promise<ActivationResult<CompletedWalletActivation>> {
  if (activation.activationSource === "token") {
    const activationApi = getActivationApi();

    if (!activationApi) {
      return {
        ok: false,
        error: "Activation service is unavailable. Configure EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL and try again.",
      };
    }

    const remoteResult = await postActivationApi<RemoteCompleteResponse>(activationApi, activationApi.completePath, {
      activationId: activation.activationId,
      credentialRecordId,
      holderConnectionId,
    });

    if (remoteResult.status === "ok") {
      return {
        ok: true,
        data: {
          activationId: remoteResult.data.activationId,
          completedAt: remoteResult.data.completedAt ?? remoteResult.data.activatedAt ?? new Date().toISOString(),
          credentialExchangeId: remoteResult.data.credentialExchangeId,
          credentialRecordId: remoteResult.data.credentialRecordId,
          holderConnectionId: remoteResult.data.holderConnectionId,
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

  return {
    ok: true,
    data: {
      activationId: activation.activationId,
      completedAt: new Date().toISOString(),
      credentialExchangeId: activation.credentialExchangeId,
      credentialRecordId,
      holderConnectionId,
    },
  };
}
