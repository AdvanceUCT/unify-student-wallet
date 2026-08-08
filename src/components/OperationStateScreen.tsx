import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { TrustSeal } from "@/src/components/TrustSeal";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export type OperationTone = "loading" | "success" | "warning" | "error" | "secure";

export function OperationStateScreen({
  tone,
  eyebrow,
  title,
  message,
  detail,
  primaryAction,
  secondaryAction,
}: {
  tone: OperationTone;
  eyebrow?: string;
  title: string;
  message: string;
  detail?: string;
  primaryAction?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
}) {
  return (
    <AppScreen scrollable={false} contentContainerStyle={{ paddingTop: spacing["3xl"] }}>
      <View style={{ flex: 1, justifyContent: "space-between", paddingBottom: spacing.lg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xl }}>
          <TrustSeal haptic={tone === "success" || tone === "warning" || tone === "error"} state={tone} />
          <View style={{ alignItems: "center", gap: spacing.sm, maxWidth: 360 }}>
            {eyebrow ? <Text style={typography.eyebrow}>{eyebrow}</Text> : null}
            <Text accessibilityRole="header" style={[typography.display, { textAlign: "center" }]}>{title}</Text>
            <Text accessibilityLiveRegion="polite" style={[typography.bodyLg, { color: colors.inkMuted, textAlign: "center" }]}>{message}</Text>
            {detail ? <Text selectable style={[typography.caption, { textAlign: "center", marginTop: spacing.sm }]}>{detail}</Text> : null}
          </View>
        </View>
        {primaryAction || secondaryAction ? (
          <View style={{ gap: spacing.md }}>
            {primaryAction ? <AppButton label={primaryAction.label} onPress={primaryAction.onPress} size="lg" /> : null}
            {secondaryAction ? <AppButton label={secondaryAction.label} onPress={secondaryAction.onPress} variant="ghost" /> : null}
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}
