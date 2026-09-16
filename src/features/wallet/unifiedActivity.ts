/**
 * @fileoverview Normalizes credential and payment activity into one wallet feed.
 * @module features/wallet/unifiedActivity
 */

import { formatZarMinor } from "@/src/features/payment/money";
import type { WalletActivity } from "@/src/features/payment/paymentApi";
import type { VerificationActivityRecord } from "@/src/features/verification/activityHistory";
import { verificationOutcomeLabel } from "@/src/features/verification/verificationOutcome";

export type UnifiedActivityFilter = "all" | "payments" | "topups" | "verifications";
export type UnifiedActivityKind = "payment" | "topup" | "verification";
export type UnifiedActivityTone = "success" | "warning" | "error" | "neutral";

export type UnifiedActivityItem = {
  id: string;
  kind: UnifiedActivityKind;
  title: string;
  subtitle: string;
  status: string;
  occurredAt: string;
  tone: UnifiedActivityTone;
  amountText?: string;
  amountDirection?: "credit" | "debit";
  reference?: string;
};

export const ACTIVITY_FILTERS: { key: UnifiedActivityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "payments", label: "Payments" },
  { key: "topups", label: "Top-ups" },
  { key: "verifications", label: "Verifications" },
];

function paymentTone(status: string): UnifiedActivityTone {
  const normalized = status.toLowerCase();
  if (normalized.includes("fail") || normalized.includes("declin") || normalized.includes("cancel")) return "error";
  if (normalized.includes("pending") || normalized.includes("unknown") || normalized.includes("processing")) return "warning";
  return "success";
}

function verificationTone(status: VerificationActivityRecord["status"]): UnifiedActivityTone {
  if (status === "Approved") return "success";
  if (status === "Expired") return "warning";
  return "error";
}

function paymentTitle(item: WalletActivity) {
  if (item.type === "TOPUP") return "Wallet top-up";
  if (item.type === "REFUND") {
    const normalized = item.title.toLowerCase();
    return normalized.includes("refund") || normalized.includes("returned") ? item.title : `Refund from ${item.title}`;
  }
  return item.title;
}

function paymentSubtitle(item: WalletActivity) {
  if (item.type === "TOPUP") {
    const normalized = item.status.toLowerCase();
    if (normalized.includes("fail") || normalized.includes("cancel")) return "Top-up failed";
    if (normalized.includes("pending") || normalized.includes("unknown") || normalized.includes("processing")) return "Top-up pending";
    return "Wallet credited";
  }
  if (item.type === "REFUND" && item.direction === "CREDIT") {
    const returned = "Money was returned to your wallet.";
    return item.subtitle ? `${item.subtitle} ${returned}` : returned;
  }
  return item.subtitle ?? item.reference ?? "Wallet transaction";
}

export function normalizeWalletActivity(items: WalletActivity[]): UnifiedActivityItem[] {
  return items.map((item) => ({
    id: `payment-${item.id}`,
    kind: item.type === "TOPUP" ? "topup" : "payment",
    title: paymentTitle(item),
    subtitle: paymentSubtitle(item),
    status: item.status,
    occurredAt: item.completedAt ?? item.createdAt,
    tone: paymentTone(item.status),
    amountText: `${item.direction === "CREDIT" ? "+" : "-"}${formatZarMinor(item.amountMinor)}`,
    amountDirection: item.direction === "CREDIT" ? "credit" : "debit",
    reference: item.reference,
  }));
}

export function normalizeVerificationActivity(items: VerificationActivityRecord[]): UnifiedActivityItem[] {
  return items.map((item) => {
    const outcomeLabel = verificationOutcomeLabel(item);
    const showOutcome = item.status !== "Approved" || Boolean(item.failureCode);
    return {
      id: `verification-${item.id}`,
      kind: "verification",
      title: item.verifierName,
      subtitle: showOutcome ? `${item.servicePointName} · ${outcomeLabel}` : item.servicePointName,
      status: item.status,
      occurredAt: item.occurredAt,
      tone: verificationTone(item.status),
      reference: item.proofExchangeId,
    };
  });
}

export function mergeUnifiedActivity(input: {
  walletActivity?: WalletActivity[];
  verificationActivity?: VerificationActivityRecord[];
}) {
  return [
    ...normalizeWalletActivity(input.walletActivity ?? []),
    ...normalizeVerificationActivity(input.verificationActivity ?? []),
  ].sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
}

export function filterUnifiedActivity(items: UnifiedActivityItem[], filter: UnifiedActivityFilter) {
  if (filter === "all") return items;
  if (filter === "topups") return items.filter((item) => item.kind === "topup");
  if (filter === "verifications") return items.filter((item) => item.kind === "verification");
  return items.filter((item) => item.kind === "payment");
}
