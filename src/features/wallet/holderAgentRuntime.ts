import type * as HolderAgentModule from "./holderAgent";

export type HolderAgentRuntime = typeof HolderAgentModule;

let runtimePromise: Promise<HolderAgentRuntime> | null = null;

export function loadHolderAgentRuntime() {
  runtimePromise ??= Promise.resolve()
    .then(
      // Jest cannot execute VM dynamic imports; a deferred require also stays lazy under Metro.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      () => require("./holderAgent") as HolderAgentRuntime,
    )
    .catch((error: unknown) => {
      runtimePromise = null;
      throw error;
    });
  return runtimePromise;
}

export function loadedHolderAgentRuntime() {
  return runtimePromise;
}

export async function getStoredCredentialsLazy() {
  return (await loadHolderAgentRuntime()).getStoredCredentials();
}

export async function getCredentialRecordLazy(credentialRecordId: string) {
  return (await loadHolderAgentRuntime()).getCredentialRecord(credentialRecordId);
}

export async function receiveVerificationProofRequestLazy(invitationUrl: string, signal?: AbortSignal) {
  return (await loadHolderAgentRuntime()).receiveVerificationProofRequest(invitationUrl, signal);
}

export async function selectVerificationCredentialsLazy(
  proofRecordId: string,
  requestedAttributes: readonly string[],
) {
  return (await loadHolderAgentRuntime()).selectVerificationCredentials(proofRecordId, requestedAttributes);
}

export async function acceptVerificationProofLazy(
  selection: HolderAgentModule.VerificationProofSelection,
) {
  return (await loadHolderAgentRuntime()).acceptVerificationProof(selection);
}

export async function exportEncryptedHolderWalletLazy(path: string, recoveryPassword: string) {
  return (await loadHolderAgentRuntime()).exportEncryptedHolderWallet(path, recoveryPassword);
}

export async function validateEncryptedHolderWalletBackupLazy(path: string, recoveryPassword: string) {
  return (await loadHolderAgentRuntime()).validateEncryptedHolderWalletBackup(path, recoveryPassword);
}
