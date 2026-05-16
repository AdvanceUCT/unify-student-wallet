import { type ReactNode } from "react";
import { Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { rules } from "@/src/theme/rules";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type EmptyStateProps = {
  eyebrow: string;
  heading?: string;
  body?: string;
  action?: ReactNode;
  bordered?: boolean;
};

export function EmptyState({ eyebrow, heading, body, action, bordered = true }: EmptyStateProps) {
  return (
    <View
      style={{
        paddingVertical: spacing["2xl"],
        paddingHorizontal: spacing.lg,
        borderColor: colors.ruleSoft,
        borderWidth: bordered ? rules.ink : 0,
        borderStyle: "dashed",
        gap: spacing.md,
        alignItems: "flex-start",
      }}
    >
      <Text style={typography.eyebrow}>{eyebrow}</Text>
      {heading ? <Text style={typography.heading}>{heading}</Text> : null}
      {body ? <Text style={typography.body}>{body}</Text> : null}
      {action ? <View style={{ marginTop: spacing.sm }}>{action}</View> : null}
    </View>
  );
}
