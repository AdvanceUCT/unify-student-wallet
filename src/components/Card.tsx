import { type PropsWithChildren, type ReactNode } from "react";
import { Text, View, type ViewStyle } from "react-native";

import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { rules } from "@/src/theme/rules";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type CardProps = PropsWithChildren<{
  eyebrow?: string;
  heading?: string;
  trailing?: ReactNode;
  surface?: "white" | "alt" | "cream";
  padded?: boolean;
  style?: ViewStyle;
}>;

export function Card({
  eyebrow,
  heading,
  trailing,
  surface = "white",
  padded = true,
  style,
  children,
}: CardProps) {
  const backgroundColor =
    surface === "white" ? colors.surface : surface === "alt" ? colors.surfaceAlt : colors.background;

  return (
    <View
      style={{
        backgroundColor,
        borderColor: colors.rule,
        borderWidth: rules.ink,
        borderRadius: radii.sm,
        padding: padded ? spacing.lg : 0,
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
            marginBottom: heading ? spacing.md : spacing.sm,
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
