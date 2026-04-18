import { Link, type Href } from "expo-router";
import { Pressable, Text } from "react-native";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

type AppButtonProps = {
  label: string;
  href?: Href;
  onPress?: () => void;
  variant?: "primary" | "secondary";
};

export function AppButton({ label, href, onPress, variant = "primary" }: AppButtonProps) {
  const backgroundColor = variant === "primary" ? colors.primary : colors.surface;
  const borderColor = variant === "primary" ? colors.primary : colors.border;
  const color = variant === "primary" ? colors.white : colors.text;

  const content = (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor,
        borderColor,
        borderRadius: 8,
        borderWidth: 1,
        opacity: pressed ? 0.85 : 1,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      })}
    >
      <Text style={{ color, fontSize: 16, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );

  if (href) {
    return (
      <Link asChild href={href}>
        {content}
      </Link>
    );
  }

  return content;
}
