import { Platform } from "react-native";

import { DEMO_ACTIVATION_CODE, DEMO_STUDENT_ID, DEMO_WALLET_ID } from "./sessionTypes";
import type { ActivationLinkRequest } from "./activationLinks";

// Mock adapter boundary for AD-39 until the issuer/activation service exists.
// Replace these functions with HTTP calls to /wallet/activation/resolve and
// /wallet/activation/complete without changing the wallet session flow.

export type ResolvedWalletActivation = {
  activationId: string;
  activationSource: ActivationLinkRequest["kind"] | "demo-code";
  createdAt: string;
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
  credentialRecordId: string;
  holderConnectionId: string;
};

const DEFAULT_WEB_ADMIN_API_BASE_URL = "http://localhost:3000";

function getAdminActivationApiBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_UNIFY_ADMIN_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  if (Platform.OS === "web" && process.env.NODE_ENV !== "test") {
    return DEFAULT_WEB_ADMIN_API_BASE_URL;
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

async function postAdminMock<T>(path: string, body: object): Promise<RemotePostResult<T>> {
  const baseUrl = getAdminActivationApiBaseUrl();

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
        error: apiErrorMessage(responseBody, `Admin mock activation request failed with status ${response.status}.`),
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
  if (request.kind === "token" && request.token.trim().toUpperCase() !== DEMO_ACTIVATION_CODE) {
    const remoteResult = await postAdminMock<RemoteResolveResponse>("/api/mock/wallet/activation/resolve", {
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
    const remoteResult = await postAdminMock<RemoteCompleteResponse>("/api/mock/wallet/activation/complete", {
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
          credentialRecordId: remoteResult.data.credentialRecordId,
          holderConnectionId: remoteResult.data.holderConnectionId,
        },
      };
    }

    if (remoteResult.status === "error") {
      return { ok: false, error: remoteResult.error };
    }
  }

  return {
    ok: true,
    data: {
      activationId: activation.activationId,
      completedAt: new Date().toISOString(),
      credentialRecordId,
      holderConnectionId,
    },
  };
}
