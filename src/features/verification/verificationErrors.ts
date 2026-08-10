/**
 * @fileoverview Classifies verification failures into safe retry and recovery guidance.
 * @module features/verification/verificationErrors
 */

export type WalletVerificationErrorCode = "CREDENTIAL_REVOKED" | "REVOCATION_CHECK_FAILED";

export class WalletVerificationError extends Error {
  constructor(
    readonly code: WalletVerificationErrorCode,
    message: string,
    readonly proofRecordId?: string,
  ) {
    super(message);
    this.name = "WalletVerificationError";
  }
}

export function isAbortError(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.message.toLowerCase().includes("cancelled"));
}
