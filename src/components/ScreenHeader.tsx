import { type ReactNode } from "react";
import { Text, View } from "react-native";

import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  meta?: string;
  variant?: "display" | "title";
  trailing?: ReactNode;
};

export function ScreenHeader({ eyebrow, title, meta, variant = "title", trailing }: ScreenHeaderProps) {
  const titleStyle = variant === "display" ? typography.display : typography.title;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        marginBottom: spacing.xl,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        {eyebrow ? <Text style={typography.caption}>{eyebrow}</Text> : null}
        <Text style={titleStyle}>{title}</Text>
        {meta ? <Text style={typography.body}>{meta}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}
