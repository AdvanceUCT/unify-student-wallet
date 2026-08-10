import { deleteSecureValue, getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";
import { type VerificationFailureCode, type VerificationStatus } from "@/src/lib/api/verification";

export const VERIFICATION_ACTIVITY_STORAGE_KEY = "unify.verification.activity.v1";
const MAX_ACTIVITY_RECORDS = 50;

export type VerificationActivityRecord = {
  id: string;
  walletId: string;
  proofExchangeId: string;
  verifierName: string;
  servicePointName: string;
  status: Exclude<VerificationStatus, "Pending">;
  failureCode?: VerificationFailureCode;
  disclosedValues: { name: string; value: string }[];
  occurredAt: string;
};

export function parseVerificationActivity(raw: string | null): VerificationActivityRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((record): record is VerificationActivityRecord =>
      typeof record?.id === "string" &&
      typeof record?.walletId === "string" &&
      typeof record?.proofExchangeId === "string" &&
      typeof record?.verifierName === "string" &&
      typeof record?.servicePointName === "string" &&
      ["Approved", "Declined", "Expired", "Failed"].includes(record?.status) &&
      Array.isArray(record?.disclosedValues) &&
      typeof record?.occurredAt === "string",
    );
  } catch {
    return [];
  }
}

export async function getVerificationActivity(walletId: string) {
  const records = parseVerificationActivity(await getSecureValue(VERIFICATION_ACTIVITY_STORAGE_KEY));
  return records.filter((record) => record.walletId === walletId);
}

export async function addVerificationActivity(record: VerificationActivityRecord) {
  const records = parseVerificationActivity(await getSecureValue(VERIFICATION_ACTIVITY_STORAGE_KEY));
  const withoutDuplicate = records.filter((item) => item.id !== record.id);
  await saveSecureValue(
    VERIFICATION_ACTIVITY_STORAGE_KEY,
    JSON.stringify([record, ...withoutDuplicate].slice(0, MAX_ACTIVITY_RECORDS)),
  );
}

export async function clearVerificationActivity() {
  await deleteSecureValue(VERIFICATION_ACTIVITY_STORAGE_KEY);
}
