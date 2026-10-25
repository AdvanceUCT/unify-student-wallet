/**
 * @fileoverview Renders a labeled wallet text field with validation feedback.
 * @module components/AppTextField
 */

import { useState } from "react";
import { Text, TextInput, type TextInputProps, View } from "react-native";

import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export function AppTextField({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const colors = useThemePalette();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={typography.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
        onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
        placeholderTextColor={colors.inkSubtle}
        style={[
          { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1.5, borderColor: error ? colors.error : focused ? colors.focus : colors.rule, color: colors.ink, fontFamily: "IBMPlexSans_400Regular", fontSize: 16, minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
          props.style,
        ]}
      />
      {error ? <Text accessibilityLiveRegion="polite" style={[typography.caption, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}
