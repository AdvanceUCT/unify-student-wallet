import { apiClient } from "@/src/lib/api/apiClient";

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

export function verificationFailureMessage(code: VerificationFailureCode) {
  return FAILURE_MESSAGES[code];
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
      reject(new DOMException("The request was cancelled.", "AbortError"));
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

  throw new DOMException("The request was cancelled.", "AbortError");
}
