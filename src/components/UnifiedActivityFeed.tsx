/**
 * @fileoverview Renders a unified wallet activity feed for payments, top-ups, refunds, and verifications.
 * @module components/UnifiedActivityFeed
 */

import { CreditCard, History, RefreshCcw, ShieldCheck } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { activityDateLabel } from "@/src/components/ActivityLedger";
import { StatusPill } from "@/src/components/StatusPill";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { ACTIVITY_FILTERS, type UnifiedActivityFilter, type UnifiedActivityItem } from "@/src/features/wallet/unifiedActivity";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

function iconFor(item: UnifiedActivityItem) {
  if (item.kind === "verification") return ShieldCheck;
  if (item.kind === "topup") return CreditCard;
  return RefreshCcw;
}

function toneColors(item: UnifiedActivityItem, colors: ReturnType<typeof useThemePalette>) {
  if (item.amountDirection === "credit") return { background: colors.successSoft, foreground: colors.success };
  if (item.amountDirection === "debit") return { background: colors.errorSoft, foreground: colors.error };
  if (item.tone === "success") return { background: colors.successSoft, foreground: colors.success };
  if (item.tone === "warning") return { background: colors.warningSoft, foreground: colors.warning };
  if (item.tone === "error") return { background: colors.errorSoft, foreground: colors.error };
  return { background: colors.surfaceAlt, foreground: colors.inkSubtle };
}

function pillTone(item: UnifiedActivityItem) {
  if (item.tone === "success") return "success" as const;
  if (item.tone === "warning") return "warning" as const;
  if (item.tone === "error") return "error" as const;
  return "ink" as const;
}

type UnifiedActivityFeedProps = {
  compact?: boolean;
  filter?: UnifiedActivityFilter;
  items: UnifiedActivityItem[];
  onFilterChange?: (filter: UnifiedActivityFilter) => void;
  showFilters?: boolean;
};

export function UnifiedActivityFeed({
  compact = false,
  filter = "all",
  items,
  onFilterChange,
  showFilters = false,
}: UnifiedActivityFeedProps) {
  const colors = useThemePalette();
  const groups = items.reduce<[string, UnifiedActivityItem[]][]>((nextGroups, item) => {
    const label = activityDateLabel(item.occurredAt);
    const latestGroup = nextGroups[nextGroups.length - 1];
    if (latestGroup?.[0] === label) {
      latestGroup[1].push(item);
    } else {
      nextGroups.push([label, [item]]);
    }
    return nextGroups;
  }, []);

  return (
    <View style={{ gap: spacing.md }}>
      {showFilters ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: spacing.sm, paddingRight: spacing.xl }}>
            {ACTIVITY_FILTERS.map((option) => {
              const selected = option.key === filter;
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onFilterChange?.(option.key)}
                  style={({ pressed }) => ({
                    backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                    borderColor: selected ? colors.primary : colors.rule,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    minHeight: 40,
                    opacity: pressed ? 0.72 : 1,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.sm,
                  })}
                >
                  <Text style={[typography.label, { color: selected ? colors.white : colors.ink }]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      {groups.length > 0 ? (
        <View style={{ borderTopWidth: 1, borderColor: colors.rule }}>
          {groups.map(([label, groupItems]) => (
            <View key={label}>
              <Text style={[typography.eyebrow, { paddingTop: compact ? spacing.md : spacing.lg, paddingBottom: spacing.xs }, compact ? { fontSize: 10, lineHeight: 14 } : undefined]}>{label}</Text>
              {groupItems.map((item) => {
                const Icon = iconFor(item);
                const tone = toneColors(item, colors);
                return (
                  <View key={item.id} style={{ borderBottomWidth: 1, borderColor: compact ? colors.ruleSoft : colors.rule, paddingVertical: compact ? spacing.md : spacing.lg }}>
                    <View style={{ alignItems: "center", flexDirection: "row", gap: compact ? spacing.md : spacing.md }}>
                      <View style={{ alignItems: "center", backgroundColor: tone.background, borderRadius: radii.md, height: compact ? 36 : 42, justifyContent: "center", width: compact ? 36 : 42 }}>
                        <Icon color={tone.foreground} size={compact ? 17 : 20} strokeWidth={1.9} />
                      </View>
                      <View style={{ flex: 1, gap: compact ? 0 : 2, minWidth: 0 }}>
                        <Text numberOfLines={1} style={[typography.bodyStrong, compact ? { fontSize: 13, lineHeight: 17 } : undefined]}>{item.title}</Text>
                        <Text numberOfLines={compact ? 2 : 2} style={[typography.body, compact ? { fontSize: 12, lineHeight: 16 } : undefined]}>{item.subtitle}</Text>
                        {!compact ? <Text style={typography.caption}>{new Date(item.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text> : null}
                      </View>
                      {item.amountText ? (
                        <Text
                          adjustsFontSizeToFit
                          minimumFontScale={0.78}
                          numberOfLines={1}
                          style={[
                            typography.bodyStrong,
                            {
                              color: tone.foreground,
                              fontSize: compact ? 15 : 16,
                              lineHeight: compact ? 20 : 22,
                              maxWidth: compact ? 92 : 108,
                              textAlign: "right",
                            },
                          ]}
                        >
                          {item.amountText}
                        </Text>
                      ) : (
                        <StatusPill label={item.status} tone={pillTone(item)} />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: "center", borderColor: colors.rule, borderTopWidth: 1, gap: spacing.sm, paddingVertical: spacing["2xl"] }}>
          <History color={colors.inkSubtle} size={26} strokeWidth={1.7} />
          <Text style={typography.bodyStrong}>No matching activity yet</Text>
          <Text style={[typography.body, { color: colors.inkMuted, textAlign: "center" }]}>Payments, top-ups, refunds, and verification events will appear here when available.</Text>
        </View>
      )}
    </View>
  );
}
