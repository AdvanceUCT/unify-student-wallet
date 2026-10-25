/**
 * @fileoverview Resolves activation capabilities and preserves resumable activation state.
 * @module features/wallet/activationResolver
 */

import { ApiClientError, apiClient } from "@/src/lib/api/apiClient";

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

function activationErrorMessage(error: unknown) {
  if (!(error instanceof ApiClientError)) {
    return "Activation could not be completed. Please try again.";
  }
  if (error.kind === "http") return error.message;
  if (error.kind === "timeout") return "Activation timed out. Check your connection and try again.";
  if (error.kind === "cancelled") return "Activation was cancelled. Open the activation link again to retry.";
  return "Activation service is unavailable. Check that the Credo agent service is running and try again.";
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
/** Resolves an activation capability without accepting the enclosed credential offer. */
export async function resolveWalletActivation(request: ActivationLinkRequest): Promise<ActivationResult<ResolvedWalletActivation>> {
  if (request.kind === "token") {
    try {
      const remoteResult = await apiClient.post<RemoteResolveResponse>(
        "/api/wallet/activation/resolve",
        {
          kind: "token",
          sourceUrl: request.sourceUrl,
          token: request.token,
        },
        { timeoutMs: 10_000 },
      );
      return {
        ok: true,
        data: {
          activationId: remoteResult.activationId,
          activationSource: "token",
          createdAt: remoteResult.createdAt,
          credentialExchangeId: remoteResult.credentialExchangeId,
          expiresAt: remoteResult.expiresAt,
          invitationId: remoteResult.invitationId,
          invitationUrl: remoteResult.invitationUrl,
          issuerLabel: remoteResult.issuerLabel,
        },
      };
    } catch (error) {
      return { ok: false, error: activationErrorMessage(error) };
    }
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
