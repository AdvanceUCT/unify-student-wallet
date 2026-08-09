import { Clock3, ShieldCheck, Store } from "lucide-react-native";
import { Text, View, type ViewStyle } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { formatCredentialLabel, formatCredentialValue } from "@/src/features/wallet/credentialDisplay";
import { radii } from "@/src/theme/radii";
import { shadows } from "@/src/theme/shadows";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export type ConsentValue = { name: string; value: string };

type VerificationConsentPanelProps = {
  compact?: boolean;
  expiresAt?: string;
  primaryAction?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
  servicePointName: string;
  showContext?: boolean;
  style?: ViewStyle;
  values: ConsentValue[];
  verifierName: string;
};

export function VerificationConsentPanel({
  compact = false,
  expiresAt,
  primaryAction,
  secondaryAction,
  servicePointName,
  showContext = true,
  style,
  values,
  verifierName,
}: VerificationConsentPanelProps) {
  const colors = useThemePalette();
  const rowPadding = compact ? 6 : spacing.md;
  const iconSize = compact ? 18 : 22;
  const expires = expiresAt ? new Date(expiresAt) : undefined;
  const expiryLabel = expires && Number.isFinite(expires.getTime())
    ? expires.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : undefined;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.rule,
        padding: compact ? spacing.md : spacing.xl,
        gap: compact ? spacing.sm : spacing.lg,
        ...shadows.md,
        ...style,
      }}
    >
      {showContext ? (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
          <View style={{ width: compact ? 32 : 44, height: compact ? 32 : 44, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft, borderRadius: radii.md }}>
            <Store color={colors.primary} size={iconSize} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={[typography.eyebrow, compact ? { fontSize: 9, lineHeight: 12 } : undefined]}>Exact values requested</Text>
            <Text accessibilityRole="header" style={[typography.heading, compact ? { fontSize: 12, lineHeight: 16 } : undefined]}>{verifierName}</Text>
            <Text style={[typography.body, compact ? { fontSize: 9, lineHeight: 12 } : undefined]}>{servicePointName}</Text>
          </View>
          {expiryLabel ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <Clock3 color={colors.inkSubtle} size={compact ? 12 : 15} />
              <Text style={[typography.caption, compact ? { fontSize: 9 } : undefined]}>{expiryLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: spacing.xs }}>
          <Text style={typography.eyebrow}>Exact values requested</Text>
          <Text accessibilityRole="header" style={typography.heading}>Review information</Text>
        </View>
      )}

      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule }}>
        {values.map((item, index) => {
          const label = formatCredentialLabel(item.name);
          const value = formatCredentialValue(item.name, item.value);
          const stackValue = !compact && value.length > 24;
          return (
            <View
              key={`${item.name}-${index}`}
              style={{
                alignItems: "flex-start",
                borderBottomWidth: index < values.length - 1 ? 1 : 0,
                borderColor: colors.ruleSoft,
                flexDirection: stackValue ? "column" : "row",
                gap: stackValue ? spacing.xs : spacing.md,
                paddingVertical: rowPadding,
              }}
            >
              <Text style={[typography.body, { flex: stackValue ? undefined : 1 }, compact ? { fontSize: 9, lineHeight: 12 } : undefined]}>{label}</Text>
              <Text
                selectable={!compact}
                style={[
                  typography.bodyStrong,
                  { flex: stackValue ? undefined : 1, textAlign: stackValue ? "left" : "right", width: stackValue ? "100%" : undefined },
                  compact ? { fontSize: 10, lineHeight: 12 } : undefined,
                ]}
              >
                {value}
              </Text>
            </View>
          );
        })}
      </View>

      {!compact ? (
        <View style={{ flexDirection: "row", gap: spacing.md, backgroundColor: colors.primarySoft, padding: spacing.md, borderRadius: radii.md }}>
          <ShieldCheck color={colors.primary} size={20} />
          <Text style={[typography.body, { color: colors.ink, flex: 1 }]}>Only these approved values are presented. Your credential remains in this wallet.</Text>
        </View>
      ) : null}

      {primaryAction ? (
        <View style={{ gap: spacing.sm }}>
          <AppButton label={primaryAction.label} onPress={primaryAction.onPress} size={compact ? "md" : "lg"} />
          {secondaryAction ? <AppButton label={secondaryAction.label} onPress={secondaryAction.onPress} variant="ghost" /> : null}
        </View>
      ) : compact ? (
        <View style={{ height: 30, backgroundColor: colors.primaryDeep, alignItems: "center", justifyContent: "center", borderRadius: radii.md }}>
          <Text style={[typography.label, { color: colors.white, fontSize: 10 }]}>Present credential</Text>
        </View>
      ) : null}
    </View>
  );
}
