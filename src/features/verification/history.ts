import type { VerificationFailureCode, VerificationStatus } from "@/src/lib/api/verification";

export type VerificationHistoryKind = "servicePoint" | "checkout";
export type VerificationHistoryStatus = Exclude<VerificationStatus, "Pending">;

export type VerificationHistoryItem = {
  verificationRequestId: string;
  kind: VerificationHistoryKind;
  vendorName: string;
  servicePointName: string;
  status: VerificationHistoryStatus;
  failureCode?: VerificationFailureCode;
  expiresAt: string;
  completedAt?: string;
  recordedAt: string;
};

export const MAX_VERIFICATION_HISTORY_ITEMS = 100;

const FINAL_STATUSES = new Set<VerificationHistoryStatus>(["Approved", "Declined", "Expired", "Failed"]);
const HISTORY_KINDS = new Set<VerificationHistoryKind>(["servicePoint", "checkout"]);

function isFiniteDate(value: string) {
  return Number.isFinite(Date.parse(value));
}

function stringField(record: Record<string, unknown>, key: keyof VerificationHistoryItem) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function isVerificationHistoryStatus(value: VerificationStatus): value is VerificationHistoryStatus {
  return FINAL_STATUSES.has(value as VerificationHistoryStatus);
}

export function parseVerificationHistory(value: unknown): VerificationHistoryItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): VerificationHistoryItem | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const verificationRequestId = stringField(record, "verificationRequestId");
      const kind = record.kind;
      const vendorName = stringField(record, "vendorName");
      const servicePointName = stringField(record, "servicePointName");
      const status = record.status;
      const expiresAt = stringField(record, "expiresAt");
      const completedAt = typeof record.completedAt === "string" ? record.completedAt : undefined;
      const recordedAt = stringField(record, "recordedAt");
      const failureCode = typeof record.failureCode === "string" ? record.failureCode : undefined;

      if (
        !verificationRequestId ||
        !HISTORY_KINDS.has(kind as VerificationHistoryKind) ||
        !vendorName ||
        !servicePointName ||
        !FINAL_STATUSES.has(status as VerificationHistoryStatus) ||
        !expiresAt ||
        !recordedAt ||
        !isFiniteDate(expiresAt) ||
        !isFiniteDate(recordedAt) ||
        (completedAt !== undefined && !isFiniteDate(completedAt))
      ) {
        return null;
      }

      return {
        verificationRequestId,
        kind: kind as VerificationHistoryKind,
        vendorName,
        servicePointName,
        status: status as VerificationHistoryStatus,
        ...(failureCode ? { failureCode: failureCode as VerificationFailureCode } : {}),
        expiresAt,
        ...(completedAt ? { completedAt } : {}),
        recordedAt,
      };
    })
    .filter((item): item is VerificationHistoryItem => item !== null)
    .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt));
}

export function upsertVerificationHistory(
  history: VerificationHistoryItem[],
  item: VerificationHistoryItem,
  maxItems = MAX_VERIFICATION_HISTORY_ITEMS,
) {
  return [item, ...history.filter((existing) => existing.verificationRequestId !== item.verificationRequestId)]
    .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
    .slice(0, maxItems);
}

