/**
 * @fileoverview Provides an accessible icon-only button with selected state.
 * @module components/IconButton
 */

import { type ComponentType } from "react";
import { Pressable } from "react-native";
import { type LucideProps } from "lucide-react-native";

import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { radii } from "@/src/theme/radii";

type IconButtonProps = {
  accessibilityLabel: string;
  icon: ComponentType<LucideProps>;
  onPress: () => void;
  selected?: boolean;
};

export function IconButton({ accessibilityLabel, icon: Icon, onPress, selected = false }: IconButtonProps) {
  const colors = useThemePalette();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: radii.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected ? colors.primarySoft : colors.surfaceAlt,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <Icon color={selected ? colors.primary : colors.ink} size={20} strokeWidth={1.9} />
    </Pressable>
  );
}
