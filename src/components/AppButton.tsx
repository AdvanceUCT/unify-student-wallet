import { Link, type Href } from "expo-router";
import { Pressable, Text } from "react-native";

import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { shadows } from "@/src/theme/shadows";
import { spacing } from "@/src/theme/spacing";

type AppButtonVariant = "primary" | "outline" | "ghost" | "secondary";
type AppButtonSize = "md" | "lg";

type AppButtonProps = {
  disabled?: boolean;
  label: string;
  href?: Href;
  onPress?: () => void;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
};

export function AppButton({
  disabled = false,
  label,
  href,
  onPress,
  variant = "primary",
  size = "md",
}: AppButtonProps) {
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline" || variant === "secondary";
  const isGhost = variant === "ghost";

  const backgroundColor = isPrimary ? colors.primary : isOutline ? colors.surfaceAlt : "transparent";
  const textColor = isPrimary ? colors.surface : isGhost ? colors.primary : colors.ink;
  const paddingVertical = size === "lg" ? spacing.lg : spacing.md + 2;
  const fontSize = size === "lg" ? 16 : 15;

  const content = (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        justifyContent: "center",
        backgroundColor,
        borderRadius: radii.pill,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        paddingHorizontal: spacing.xl,
        paddingVertical,
        ...(isPrimary ? shadows.sm : null),
      })}
    >
      <Text
        style={{
          color: textColor,
          fontSize,
          fontWeight: "600",
          letterSpacing: 0.1,
        }}
      >
        {label}
      </Text>
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
