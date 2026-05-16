import { Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { rules } from "@/src/theme/rules";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  meta?: string;
  variant?: "display" | "title";
};

export function ScreenHeader({ eyebrow, title, meta, variant = "title" }: ScreenHeaderProps) {
  const titleStyle = variant === "display" ? typography.display : typography.title;

  return (
    <View
      style={{
        paddingBottom: spacing.lg,
        borderBottomColor: colors.rule,
        borderBottomWidth: rules.ink,
        marginBottom: spacing.xl,
        gap: spacing.sm,
      }}
    >
      {eyebrow ? <Text style={typography.eyebrow}>{eyebrow}</Text> : null}
      <Text style={titleStyle}>{title}</Text>
      {meta ? <Text style={typography.mono}>{meta}</Text> : null}
    </View>
  );
}
