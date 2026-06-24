import { apiClient } from "@/src/lib/api/apiClient";

export const VERIFICATION_ATTRIBUTES = ["studentNumber", "enrolmentStatus", "faculty", "programme"] as const;

export type VerificationAttributeName = (typeof VERIFICATION_ATTRIBUTES)[number];
export type VerificationStatus = "Pending" | "Approved" | "Declined" | "Expired" | "Failed";

export type StartVerificationSessionResult = {
  verificationRequestId: string;
  invitationUrl: string;
  resultToken: string;
  vendorName: string;
  servicePointName: string;
  requestedAttributes: VerificationAttributeName[];
  expiresAt: string;
};

export type VerificationResult = {
  status: VerificationStatus;
  failureCode?: string;
  expiresAt: string;
  completedAt?: string;
};

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
