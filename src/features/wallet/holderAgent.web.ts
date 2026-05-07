import type { ResolvedWalletActivation } from "./activationResolver";

export type HolderActivationResult = {
  credentialRecordId: string;
  holderAgentInitialized: boolean;
  holderConnectionId: string;
};

export type HolderAgentConfig = {
  mediatorInvitationUrl?: string;
  walletId: string;
};

export type HolderAgent = null;

function fallbackActivationResult(activation: ResolvedWalletActivation): HolderActivationResult {
  return {
    credentialRecordId: `credential-${activation.activationId}`,
    holderAgentInitialized: false,
    holderConnectionId: `connection-${activation.invitationId}`,
  };
}

export async function initializeHolderAgent(_config: HolderAgentConfig): Promise<HolderAgent> {
  return null;
}

export async function acceptCredentialInvitation(
  _agent: HolderAgent,
  activation: ResolvedWalletActivation,
): Promise<HolderActivationResult> {
  return fallbackActivationResult(activation);
}

export async function acceptHolderActivation(activation: ResolvedWalletActivation): Promise<HolderActivationResult> {
  return fallbackActivationResult(activation);
}
