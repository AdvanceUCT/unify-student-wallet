import { Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";

type TagTone = "ink" | "primary" | "warning" | "error" | "muted";

type TagProps = {
  label: string;
  tone?: TagTone;
};

function toneStyles(tone: TagTone) {
  switch (tone) {
    case "primary":
      return { bg: colors.primarySoft, fg: colors.primaryDeep };
    case "warning":
      return { bg: colors.warningSoft, fg: colors.warning };
    case "error":
      return { bg: "#FBE5E2", fg: colors.error };
    case "muted":
      return { bg: colors.surfaceAlt, fg: colors.inkMuted };
    case "ink":
    default:
      return { bg: colors.surfaceAlt, fg: colors.ink };
  }
}

export function Tag({ label, tone = "ink" }: TagProps) {
  const { bg, fg } = toneStyles(tone);

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: bg,
        borderRadius: radii.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          color: fg,
          fontSize: 12,
          lineHeight: 16,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
