import { type ComponentType } from "react";
import { Text, View } from "react-native";
import { type LucideProps } from "lucide-react-native";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type IconBadgeProps = {
  icon: ComponentType<LucideProps>;
  label: string;
  tone?: "ink" | "primary" | "muted";
  size?: number;
};

export function IconBadge({ icon: Icon, label, tone = "ink", size = 16 }: IconBadgeProps) {
  const color = tone === "primary" ? colors.primary : tone === "muted" ? colors.inkMuted : colors.ink;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
      <Icon color={color} size={size} strokeWidth={1.5} />
      <Text style={[typography.mono, { color }]}>{label}</Text>
    </View>
  );
}
