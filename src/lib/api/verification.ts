import { apiClient } from "@/src/lib/api/apiClient";
import type { QrPayload } from "@/src/lib/validation/qrPayload";

export type VerificationCredential = {
  studentName: string;
  faculty: string;
  validUntil: string;
};

export type ServiceVerificationResult = {
  approved: boolean;
  reason?: string;
  credential?: VerificationCredential;
};

export async function submitServiceVerification(
  payload: QrPayload,
  walletId: string,
): Promise<ServiceVerificationResult> {
  const result = await apiClient.post<ServiceVerificationResult>("/api/wallet/verification/submit", {
    vendorId: payload.vendorId,
    servicePointId: payload.servicePointId,
    nonce: payload.nonce,
    walletId,
    type: payload.type,
  });

  if (result.status === "ok") {
    return result.data;
  }

  if (result.status === "error") {
    return { approved: false, reason: result.error };
  }

  return {
    approved: false,
    reason: "Verification service is unavailable. Check that the Credo agent service is running and try again.",
  };
}
