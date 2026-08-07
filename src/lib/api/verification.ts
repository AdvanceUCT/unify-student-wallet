import { ApiClientError, apiClient } from "@/src/lib/api/apiClient";
import { createAbortError } from "@/src/lib/abortError";

export type VerificationStatus = "Pending" | "Approved" | "Declined" | "Expired" | "Failed";
export type VerificationFailureCode =
  | "CREDO_PROTOCOL_ERROR"
  | "CREDENTIAL_NOT_CURRENT"
  | "PROOF_EXCHANGE_ABANDONED"
  | "PROOF_NOT_VERIFIED"
  | "PROOF_REQUEST_EXPIRED"
  | "REQUIRED_ATTRIBUTE_MISSING"
  | "REVOCATION_CHECK_FAILED"
  | "STUDENT_NOT_REGISTERED"
  | "UNTRUSTED_CREDENTIAL_DEFINITION";

export type StartVerificationSessionResult = {
  verificationRequestId: string;
  invitationUrl: string;
  resultToken: string;
  vendorName: string;
  servicePointName: string;
  requestedAttributes: string[];
  expiresAt: string;
};

export type VerificationResult = {
  status: VerificationStatus;
  failureCode?: VerificationFailureCode;
  expiresAt: string;
  completedAt?: string;
};

const FAILURE_MESSAGES: Record<VerificationFailureCode, string> = {
  CREDO_PROTOCOL_ERROR: "The verifier could not process the credential proof.",
  CREDENTIAL_NOT_CURRENT: "This credential is suspended, revoked, or no longer current.",
  PROOF_EXCHANGE_ABANDONED: "The credential presentation was not completed.",
  PROOF_NOT_VERIFIED: "The credential proof could not be verified.",
  PROOF_REQUEST_EXPIRED: "The verification session expired before presentation completed.",
  REQUIRED_ATTRIBUTE_MISSING: "The credential does not contain every requested value.",
  REVOCATION_CHECK_FAILED: "The verifier could not confirm the credential's current status.",
  STUDENT_NOT_REGISTERED: "The credential does not identify a registered student.",
  UNTRUSTED_CREDENTIAL_DEFINITION: "The credential was not issued by a trusted institution.",
};

const REQUEST_ERROR_MESSAGES: Record<string, string> = {
  CLIENT_REQUEST_EXPIRED: "The previous verification attempt expired. Scan the QR code again.",
  INVALID_SESSION_CAPABILITY: "This checkout verification link is invalid. Return to the checkout for a new link.",
  INVALID_VERIFICATION_RESULT_TOKEN: "The verification result link is invalid. Start a new verification.",
  SERVICE_POINT_DISABLED: "This service point is not accepting verifications right now.",
  SERVICE_POINT_NOT_FOUND: "This verification QR code is no longer valid.",
  VERIFICATION_REQUEST_NOT_FOUND: "This verification request is no longer available.",
  VERIFICATION_RESULT_EXPIRED: "This verification result is no longer available. Start a new verification.",
  VERIFICATION_SERVICE_POINT_BUSY: "This service point is busy. Wait a moment and scan again.",
  VERIFICATION_SESSION_EXPIRED: "This checkout verification link expired. Return to the checkout for a new link.",
  VERIFICATION_SESSION_NOT_FOUND: "This checkout verification link is no longer valid.",
  VERIFICATION_SESSION_REUSED: "This checkout verification link has already been used.",
  VERIFIER_NOT_CONFIGURED: "Verification is temporarily unavailable at this service point.",
};

export function verificationFailureMessage(code: VerificationFailureCode) {
  return FAILURE_MESSAGES[code] ?? "The verifier could not complete this verification.";
}

export function verificationRequestErrorMessage(error: unknown) {
  if (!(error instanceof ApiClientError)) return "Verification could not be completed. Try again.";
  if (error.code && REQUEST_ERROR_MESSAGES[error.code]) return REQUEST_ERROR_MESSAGES[error.code];
  if (error.kind === "timeout") return "Verification timed out. Check your connection and try again.";
  if (error.kind === "network") return "The verification service is unavailable. Check your connection and try again.";
  if (error.kind === "cancelled") return "Verification was cancelled.";
  return "Verification could not be completed. Try again or request a new verification link.";
}

export function startVerificationSession(
  publicServicePointId: string,
  clientRequestId: string,
  signal?: AbortSignal,
) {
  return apiClient.post<StartVerificationSessionResult>(
    "/api/wallet/verification/sessions",
    { publicServicePointId, clientRequestId },
    { signal, timeoutMs: 10_000 },
  );
}

export function claimCheckoutVerificationSession(
  verificationRequestId: string,
  claimToken: string,
  signal?: AbortSignal,
) {
  return apiClient.post<StartVerificationSessionResult>(
    `/api/wallet/verification/sessions/${encodeURIComponent(verificationRequestId)}/claim`,
    { claimToken },
    { signal, timeoutMs: 10_000 },
  );
}

export function getVerificationResult(
  verificationRequestId: string,
  resultToken: string,
  signal?: AbortSignal,
) {
  return apiClient.get<VerificationResult>(
    `/api/wallet/verification/sessions/${encodeURIComponent(verificationRequestId)}`,
    { resultToken, signal, timeoutMs: 10_000 },
  );
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    const cancel = () => {
      clearTimeout(timeout);
      reject(createAbortError("The request was cancelled."));
    };
    signal?.addEventListener("abort", cancel, { once: true });
  });
}

export async function pollVerificationResult(
  verificationRequestId: string,
  resultToken: string,
  signal?: AbortSignal,
): Promise<VerificationResult> {
  while (!signal?.aborted) {
    const result = await getVerificationResult(verificationRequestId, resultToken, signal);
    if (result.status !== "Pending") return result;
    await wait(1_000, signal);
  }

  throw createAbortError("The request was cancelled.");
}
