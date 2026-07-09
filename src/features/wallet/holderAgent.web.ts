import * as Crypto from "expo-crypto";

export type HolderAgentConfig = {
  walletId: string;
};

export type HolderAgent = null;

export type CreateHolderWalletResult = {
  walletId: string;
  agent: HolderAgent;
};

type CredentialRecord = {
  id: string;
  state?: string;
  connectionId?: string;
  credentialAttributes?: { name: string; value: string }[];
};

let activeWalletId: string | undefined;

export function getActiveHolderAgent(): HolderAgent {
  return null;
}

export function getActiveWalletId(): string | undefined {
  return activeWalletId;
}

export function clearActiveHolderAgent() {
  activeWalletId = undefined;
}

export async function initializeHolderAgent(config: HolderAgentConfig): Promise<HolderAgent> {
  activeWalletId = config.walletId;
  return null;
}

export async function createLocalHolderWallet(): Promise<CreateHolderWalletResult> {
  const walletId = Crypto.randomUUID();
  await initializeHolderAgent({ walletId });

  return { walletId, agent: null };
}

export async function resumeHolderAgentSession(walletId: string): Promise<HolderAgent> {
  activeWalletId = walletId;
  return null;
}

export async function exportEncryptedHolderWallet(_path: string, _recoveryPassword: string): Promise<void> {
  throw new Error("Wallet backup is only available in the installed mobile app.");
}

export async function restoreEncryptedHolderWallet(
  _path: string,
  _recoveryPassword: string,
): Promise<CreateHolderWalletResult> {
  throw new Error("Wallet recovery is only available in the installed mobile app.");
}

export async function receiveCredentialOffer(_invitationUrl: string): Promise<void> {
  return;
}

export async function acceptCredentialOffer(_credentialRecordId: string): Promise<void> {
  return;
}

export async function declineCredentialOffer(_credentialRecordId: string): Promise<void> {
  return;
}

export async function getCredentialRecord(_credentialRecordId: string): Promise<CredentialRecord | null> {
  return null;
}

export type CredentialOfferReceivedHandler = (record: CredentialRecord) => void;

export function subscribeToOfferReceived(_handler: CredentialOfferReceivedHandler): () => void {
  return () => undefined;
}
