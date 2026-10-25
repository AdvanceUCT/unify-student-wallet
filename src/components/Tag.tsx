/**
 * @fileoverview Displays a small neutral or semantic metadata label.
 * @module components/Tag
 */

import { Text, View } from "react-native";

import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import type { ColorPalette } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";

type TagTone = "ink" | "primary" | "success" | "warning" | "error" | "muted";

type TagProps = {
  label: string;
  tone?: TagTone;
};

function toneStyles(tone: TagTone, colors: ColorPalette) {
  switch (tone) {
    case "primary":
      return { bg: colors.primarySoft, fg: colors.primary };
    case "success":
      return { bg: colors.successSoft, fg: colors.success };
    case "warning":
      return { bg: colors.warningSoft, fg: colors.warning };
    case "error":
      return { bg: colors.errorSoft, fg: colors.error };
    case "muted":
      return { bg: colors.surfaceAlt, fg: colors.inkMuted };
    case "ink":
    default:
      return { bg: colors.surfaceAlt, fg: colors.ink };
  }
}

export function Tag({ label, tone = "ink" }: TagProps) {
  const colors = useThemePalette();
  const { bg, fg } = toneStyles(tone, colors);

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
          fontFamily: "IBMPlexSans_600SemiBold",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
