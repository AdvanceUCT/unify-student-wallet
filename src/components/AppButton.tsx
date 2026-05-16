import { Link, type Href } from "expo-router";
import { Pressable, Text } from "react-native";

import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { rules } from "@/src/theme/rules";
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

  const backgroundColor = isPrimary ? colors.primary : "transparent";
  const borderColor = isGhost ? "transparent" : isPrimary ? colors.primary : colors.ink;
  const textColor = isPrimary ? colors.surface : isGhost ? colors.primary : colors.ink;
  const paddingVertical = size === "lg" ? spacing.lg : spacing.md;
  const fontSize = size === "lg" ? 16 : 14;

  const content = (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor,
        borderColor,
        borderRadius: radii.sm,
        borderWidth: isGhost ? 0 : rules.ink,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        paddingHorizontal: spacing.lg,
        paddingVertical,
      })}
    >
      <Text
        style={{
          color: textColor,
          fontFamily: "IBMPlexSans_500Medium",
          fontSize,
          letterSpacing: 0.2,
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
