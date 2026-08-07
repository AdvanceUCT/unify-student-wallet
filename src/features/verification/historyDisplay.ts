import type { VerificationHistoryItem } from "./history";

export function verificationHistoryTone(status: VerificationHistoryItem["status"]) {
  if (status === "Approved") return "primary" as const;
  if (status === "Expired") return "warning" as const;
  return "error" as const;
}

export function formatVerificationHistoryDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown time";

  return date.toLocaleString(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}
