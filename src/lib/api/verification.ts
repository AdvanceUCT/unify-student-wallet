import { apiClient } from "@/src/lib/api/apiClient";

export type VerificationStatus = "Pending" | "Approved" | "Declined" | "Expired" | "Failed";

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
  | "session_expired"
  | "unknown";

const KNOWN_FAILURE_REASONS: readonly string[] = [
  "network_error",
  "credential_revoked",
  "credential_expired",
  "credential_not_found",
  "session_expired",
  "unknown",
];

function normalizeFailureReason(reason: string | undefined): VerificationFailureReason {
  if (reason && KNOWN_FAILURE_REASONS.includes(reason)) {
    return reason as VerificationFailureReason;
  }
  return "unknown";
}

export type StartVerificationSessionResult = {
  verificationRequestId: string;
  resultToken: string;
  expiresAt: string;
};

export async function startVerificationSession(
  publicServicePointId: string,
  clientRequestId: string,
): Promise<StartVerificationSessionResult> {
  const result = await apiClient.post<StartVerificationSessionResult>("/api/wallet/verification/sessions", {
    servicePointId: publicServicePointId,
    clientRequestId,
  });

  if (result.status === "ok") {
    return result.data;
  }

  throw new Error(result.status === "error" ? result.error : "Verification service unavailable.");
}

export type VerificationResult = {
  status: VerificationStatus;
  expiresAt: string;
  credential?: VerificationCredential;
  reason?: VerificationFailureReason;
};

export async function getVerificationResult(
  verificationRequestId: string,
  resultToken: string,
): Promise<VerificationResult> {
  const result = await apiClient.get<{
    status: VerificationStatus;
    expiresAt: string;
    credential?: VerificationCredential;
    reason?: string;
  }>(
    `/api/wallet/verification/sessions/${encodeURIComponent(verificationRequestId)}/result?resultToken=${encodeURIComponent(resultToken)}`,
  );

  if (result.status === "ok") {
    const { status, expiresAt, credential, reason } = result.data;
    return { status, expiresAt, credential, reason: reason ? normalizeFailureReason(reason) : undefined };
  }

  throw new Error(result.status === "error" ? result.error : "Verification service unavailable.");
}

export class VerificationPollAbortedError extends Error {
  constructor() {
    super("Verification polling was aborted.");
    this.name = "VerificationPollAbortedError";
  }
}

export type PollVerificationOptions = {
  intervalMs?: number;
  signal?: AbortSignal;
};

export async function pollVerificationResult(
  verificationRequestId: string,
  resultToken: string,
  options: PollVerificationOptions = {},
): Promise<VerificationResult> {
  const intervalMs = options.intervalMs ?? 2000;

  while (true) {
    if (options.signal?.aborted) {
      throw new VerificationPollAbortedError();
    }

    const result = await getVerificationResult(verificationRequestId, resultToken);

    if (result.status !== "Pending") {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    if (options.signal?.aborted) {
      throw new VerificationPollAbortedError();
    }
  }
}
