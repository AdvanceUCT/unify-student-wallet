import { type ComponentType, type ReactNode } from "react";
import { Text, View } from "react-native";
import { type LucideProps } from "lucide-react-native";

import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type EmptyStateProps = {
  icon?: ComponentType<LucideProps>;
  eyebrow?: string;
  heading?: string;
  body?: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, eyebrow, heading, body, action }: EmptyStateProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surfaceAlt,
        borderRadius: radii.lg,
        paddingVertical: spacing["2xl"],
        paddingHorizontal: spacing.xl,
        alignItems: "center",
        gap: spacing.sm,
      }}
    >
      {Icon ? (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.pill,
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: spacing.xs,
          }}
        >
          <Icon color={colors.primary} size={22} strokeWidth={1.6} />
        </View>
      ) : null}
      {eyebrow ? (
        <Text style={[typography.eyebrow, { textAlign: "center" }]}>{eyebrow}</Text>
      ) : null}
      {heading ? (
        <Text style={[typography.heading, { textAlign: "center" }]}>{heading}</Text>
      ) : null}
      {body ? (
        <Text style={[typography.body, { textAlign: "center" }]}>{body}</Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.md, alignSelf: "stretch" }}>{action}</View> : null}
    </View>
  );
}
