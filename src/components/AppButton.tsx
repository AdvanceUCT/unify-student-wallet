/**
 * @fileoverview Renders the shared primary, secondary, and destructive button styles.
 * @module components/AppButton
 */

import { Link, type Href } from "expo-router";
import { type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text } from "react-native";

import { BrandGradient } from "@/src/components/BrandGradient";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { radii } from "@/src/theme/radii";
import { shadows } from "@/src/theme/shadows";
import { spacing } from "@/src/theme/spacing";

type AppButtonVariant = "primary" | "outline" | "ghost" | "secondary";
type AppButtonSize = "md" | "lg";

type AppButtonProps = {
  disabled?: boolean;
  label: string;
  icon?: LucideIcon;
  href?: Href;
  onPress?: () => void;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
};

export function AppButton({
  disabled = false,
  label,
  icon: Icon,
  href,
  onPress,
  variant = "primary",
  size = "md",
}: AppButtonProps) {
  const colors = useThemePalette();
  const isPrimary = variant === "primary";
  const isOutline = variant === "outline" || variant === "secondary";
  const isGhost = variant === "ghost";

  const backgroundColor = isPrimary ? "transparent" : isOutline ? colors.surfaceAlt : "transparent";
  const textColor = isPrimary ? colors.white : isGhost ? colors.primary : colors.ink;
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
        flexDirection: "row",
        gap: spacing.sm,
        justifyContent: "center",
        backgroundColor,
        borderRadius: radii.md,
        borderWidth: isOutline ? 1 : 0,
        borderColor: colors.rule,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        paddingHorizontal: spacing.xl,
        paddingVertical,
        overflow: "hidden",
        ...(isPrimary ? shadows.sm : null),
      })}
    >
      {isPrimary ? <BrandGradient style={StyleSheet.absoluteFillObject} /> : null}
      {Icon ? <Icon color={textColor} size={18} strokeWidth={2} /> : null}
      <Text
        style={{
          color: textColor,
          fontSize,
          fontWeight: "600",
          fontFamily: "IBMPlexSans_600SemiBold",
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
