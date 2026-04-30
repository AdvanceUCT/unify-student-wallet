import type { ResolvedWalletActivation } from "./activationResolver";

export type HolderActivationResult = {
  credentialRecordId: string;
  holderAgentInitialized: boolean;
  holderConnectionId: string;
};

export async function acceptHolderActivation(activation: ResolvedWalletActivation): Promise<HolderActivationResult> {
  return {
    credentialRecordId: `credential-${activation.activationId}`,
    holderAgentInitialized: false,
    holderConnectionId: `connection-${activation.invitationId}`,
  };
}
