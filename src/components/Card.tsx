import { type PropsWithChildren, type ReactNode } from "react";
import { Text, View, type ViewStyle } from "react-native";

import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { shadows } from "@/src/theme/shadows";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type CardProps = PropsWithChildren<{
  eyebrow?: string;
  heading?: string;
  trailing?: ReactNode;
  surface?: "white" | "alt";
  padded?: boolean;
  elevation?: "sm" | "md" | "lg" | "none";
  style?: ViewStyle;
}>;

export function Card({
  eyebrow,
  heading,
  trailing,
  surface = "white",
  padded = true,
  elevation = "sm",
  style,
  children,
}: CardProps) {
  const backgroundColor = surface === "alt" ? colors.surfaceAlt : colors.surface;

  return (
    <View
      style={{
        backgroundColor,
        borderRadius: radii.lg,
        padding: padded ? spacing.lg : 0,
        ...shadows[elevation],
        ...style,
      }}
    >
      {(eyebrow || heading || trailing) && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: spacing.md,
            marginBottom: children ? spacing.md : 0,
          }}
        >
          <View style={{ flex: 1, gap: spacing.xs }}>
            {eyebrow ? <Text style={typography.eyebrow}>{eyebrow}</Text> : null}
            {heading ? <Text style={typography.heading}>{heading}</Text> : null}
          </View>
          {trailing}
        </View>
      )}
      {children}
    </View>
  );
}
