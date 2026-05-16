import { Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { rules } from "@/src/theme/rules";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type TagTone = "ink" | "primary" | "warning" | "error" | "muted";

type TagProps = {
  label: string;
  tone?: TagTone;
};

function toneColor(tone: TagTone) {
  switch (tone) {
    case "primary":
      return colors.primary;
    case "warning":
      return colors.warning;
    case "error":
      return colors.error;
    case "muted":
      return colors.inkSubtle;
    case "ink":
    default:
      return colors.ink;
  }
}

export function Tag({ label, tone = "ink" }: TagProps) {
  const color = toneColor(tone);

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderColor: color,
        borderWidth: rules.ink,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
      }}
    >
      <Text style={[typography.eyebrow, { color }]}>{label}</Text>
    </View>
  );
}
