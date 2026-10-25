/**
 * @fileoverview Renders chronological verification activity with local date grouping.
 * @module components/ActivityLedger
 */

import { CheckCircle2, Clock3, ShieldAlert } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { InfoRow } from "@/src/components/InfoRow";
import { StatusPill } from "@/src/components/StatusPill";
import type { VerificationActivityRecord } from "@/src/features/verification/activityHistory";
import { verificationOutcomeLabel } from "@/src/features/verification/verificationOutcome";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { formatCredentialLabel, formatCredentialValue } from "@/src/features/wallet/credentialDisplay";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function activityDateLabel(occurredAt: string, now = new Date()) {
  const date = new Date(occurredAt);
  if (!Number.isFinite(date.getTime())) return "Earlier";
  const dayDifference = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (dayDifference === 0) return "Today";
  if (dayDifference === 1) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "long", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

function statusTone(status: VerificationActivityRecord["status"]) {
  return status === "Approved" ? "success" as const : status === "Expired" ? "warning" as const : "error" as const;
}

type ActivityLedgerProps = {
  compact?: boolean;
  records: VerificationActivityRecord[];
};

export function ActivityLedger({ compact = false, records }: ActivityLedgerProps) {
  const colors = useThemePalette();
  const [expandedId, setExpandedId] = useState<string>();
  const groups = useMemo(() => {
    const grouped = new Map<string, VerificationActivityRecord[]>();
    records.forEach((record) => {
      const label = activityDateLabel(record.occurredAt);
      grouped.set(label, [...(grouped.get(label) ?? []), record]);
    });
    return [...grouped.entries()];
  }, [records]);

  return (
    <View style={{ borderTopWidth: 1, borderColor: colors.rule }}>
      {groups.map(([label, items]) => (
        <View key={label}>
          <Text style={[typography.eyebrow, { paddingTop: compact ? spacing.sm : spacing.lg, paddingBottom: spacing.xs }, compact ? { fontSize: 9, lineHeight: 12 } : undefined]}>{label}</Text>
          {items.map((record) => {
            const expanded = !compact && expandedId === record.id;
            const Icon = record.status === "Approved" ? CheckCircle2 : record.status === "Expired" ? Clock3 : ShieldAlert;
            const outcomeLabel = verificationOutcomeLabel(record);
            const showOutcome = record.status !== "Approved" || Boolean(record.failureCode);
            const content = (
              <>
                <View style={{ flexDirection: "row", gap: compact ? spacing.sm : spacing.md, alignItems: "center" }}>
                  <View style={{ width: compact ? 28 : 40, height: compact ? 28 : 40, borderRadius: radii.md, backgroundColor: record.status === "Approved" ? colors.successSoft : record.status === "Expired" ? colors.warningSoft : colors.errorSoft, alignItems: "center", justifyContent: "center" }}>
                    <Icon color={record.status === "Approved" ? colors.success : record.status === "Expired" ? colors.warning : colors.error} size={compact ? 14 : 20} />
                  </View>
                  <View style={{ flex: 1, gap: compact ? 0 : 2 }}>
                    <Text numberOfLines={1} style={[typography.bodyStrong, compact ? { fontSize: 10, lineHeight: 13 } : undefined]}>{record.verifierName}</Text>
                    <Text numberOfLines={1} style={[typography.body, compact ? { fontSize: 9, lineHeight: 12 } : undefined]}>{record.servicePointName}</Text>
                    {showOutcome ? <Text numberOfLines={1} style={[typography.caption, { color: statusTone(record.status) === "warning" ? colors.warning : colors.error }]}>{outcomeLabel}</Text> : null}
                    {!compact ? <Text style={typography.caption}>{new Date(record.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text> : null}
                  </View>
                  <StatusPill label={record.status} tone={statusTone(record.status)} />
                </View>
                {expanded ? (
                  <View style={{ marginLeft: 56, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderColor: colors.ruleSoft }}>
                    {record.disclosedValues.map((attribute, index) => <InfoRow key={`${record.id}-${attribute.name}`} label={formatCredentialLabel(attribute.name)} value={formatCredentialValue(attribute.name, attribute.value)} divider={index < record.disclosedValues.length - 1} />)}
                  </View>
                ) : null}
              </>
            );

            if (compact) {
              return <View key={record.id} style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.ruleSoft }}>{content}</View>;
            }

            return (
              <Pressable
                key={record.id}
                accessibilityLabel={`${record.verifierName}, ${record.servicePointName}, ${record.status}${showOutcome ? `, ${outcomeLabel}` : ""}`}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setExpandedId(expanded ? undefined : record.id)}
                style={({ pressed }) => ({ paddingVertical: spacing.lg, borderBottomWidth: 1, borderColor: colors.rule, opacity: pressed ? 0.72 : 1 })}
              >
                {content}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
