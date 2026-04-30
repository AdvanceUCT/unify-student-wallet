import { DEMO_STUDENT_ID, DEMO_WALLET_ID } from "./sessionTypes";
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
