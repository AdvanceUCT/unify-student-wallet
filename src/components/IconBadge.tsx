/**
 * @fileoverview Pairs an icon with a compact labeled status treatment.
 * @module components/IconBadge
 */

import { type ComponentType } from "react";
import { Text, View } from "react-native";
import { type LucideProps } from "lucide-react-native";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

type IconBadgeProps = {
  icon: ComponentType<LucideProps>;
  label?: string;
  tone?: "ink" | "primary" | "muted" | "success" | "warning" | "error";
  size?: number;
};

export function IconBadge({ icon: Icon, label, tone = "ink", size = 16 }: IconBadgeProps) {
  const color = tone === "primary" || tone === "success" ? colors.primary : tone === "muted" ? colors.inkMuted : tone === "warning" ? colors.warning : tone === "error" ? colors.error : colors.ink;
  const backgroundColor = tone === "warning" ? colors.warningSoft : tone === "error" ? colors.errorSoft : tone === "success" || tone === "primary" ? colors.primarySoft : colors.surfaceAlt;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
      <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor }}><Icon color={color} size={size} strokeWidth={1.7} /></View>
      {label ? <Text style={{ color, fontFamily: "IBMPlexSans_500Medium", fontSize: 13 }}>{label}</Text> : null}
    </View>
  );
}
