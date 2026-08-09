import type { VerificationActivityRecord } from "@/src/features/verification/activityHistory";
import type { VerificationFailureCode } from "@/src/lib/api/verification";

const FAILURE_LABELS: Record<VerificationFailureCode, string> = {
  CREDO_PROTOCOL_ERROR: "Proof processing failed",
  CREDENTIAL_NOT_CURRENT: "Credential revoked",
  PROOF_EXCHANGE_ABANDONED: "Presentation incomplete",
  PROOF_NOT_VERIFIED: "Proof not verified",
  PROOF_REQUEST_EXPIRED: "Request expired",
  REQUIRED_ATTRIBUTE_MISSING: "Required value missing",
  REVOCATION_CHECK_FAILED: "Credential status unavailable",
  STUDENT_NOT_REGISTERED: "Student not registered",
  UNTRUSTED_CREDENTIAL_DEFINITION: "Issuer not trusted",
};

export function verificationOutcomeLabel(record: Pick<VerificationActivityRecord, "failureCode" | "status">) {
  if (record.failureCode) return FAILURE_LABELS[record.failureCode];
  if (record.status === "Approved") return "Credential verified";
  if (record.status === "Expired") return "Verification expired";
  if (record.status === "Declined") return "Verification declined";
  return "Verification failed";
}
