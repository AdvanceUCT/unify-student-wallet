import type { ResolvedWalletActivation } from "./activationResolver";

export type CredentialRecord = {
  credentialAttributes?: Array<{ mimeType?: string; name: string; value: string }>;
  id?: string;
  state?: string;
};

export type ConnectionRecord = {
  createdAt?: Date | string;
  id?: string;
  state?: string;
  theirLabel?: string;
};

export type HolderActivationResult = {
  credentialRecordId: string;
  holderAgentInitialized: boolean;
  holderConnectionId: string;
  mediatorConnectionId?: string;
};

export function getCachedHolderAgent() {
  return null;
}

export async function getCredentialRecords(): Promise<CredentialRecord[]> {
  return [];
}

export async function pollMediatorForMessages(): Promise<void> {
  // no-op on web
}

export async function acceptHolderActivation(activation: ResolvedWalletActivation): Promise<HolderActivationResult> {
  return {
    credentialRecordId: `credential-${activation.activationId}`,
    holderAgentInitialized: false,
    holderConnectionId: `connection-${activation.invitationId}`,
  };
}

export async function resumeHolderAgentSession(_walletId: string, _mediatorInvitationUrl?: string): Promise<void> {
  // no-op on web
}
