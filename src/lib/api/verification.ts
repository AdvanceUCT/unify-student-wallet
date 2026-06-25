import { apiClient } from "@/src/lib/api/apiClient";
import type { QrPayload } from "@/src/lib/validation/qrPayload";

export type VerificationCredential = {
  studentName: string;
  faculty: string;
  validUntil: string;
};

export type VerificationFailureReason =
  | "network_error"
  | "credential_revoked"
  | "credential_expired"
  | "credential_not_found"
  | "unknown";

const KNOWN_FAILURE_REASONS: readonly string[] = [
  "network_error",
  "credential_revoked",
  "credential_expired",
  "credential_not_found",
  "unknown",
];

function normalizeFailureReason(reason: string | undefined): VerificationFailureReason {
  if (reason && KNOWN_FAILURE_REASONS.includes(reason)) {
    return reason as VerificationFailureReason;
  }
  return "unknown";
}

export type ServiceVerificationResult = {
  approved: boolean;
  reason?: VerificationFailureReason;
  credential?: VerificationCredential;
};

export async function submitServiceVerification(
  payload: QrPayload,
  walletId: string,
): Promise<ServiceVerificationResult> {
  const result = await apiClient.post<{ approved: boolean; reason?: string; credential?: VerificationCredential }>(
    "/api/wallet/verification/submit",
    {
      vendorId: payload.vendorId,
      servicePointId: payload.servicePointId,
      nonce: payload.nonce,
      walletId,
      type: payload.type,
    },
  );

  if (result.status === "ok") {
    const { approved, reason, credential } = result.data;
    return approved ? { approved, credential } : { approved, reason: normalizeFailureReason(reason) };
  }

  if (result.status === "error") {
    return { approved: false, reason: normalizeFailureReason(result.error) };
  }

  return { approved: false, reason: "network_error" };
}
