/**
 * @fileoverview Provides the nested navigation stack for credential list and detail screens.
 * @module app/(wallet)/credential/_layout
 */

import { Stack } from "expo-router";

import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";

export default function CredentialStackLayout() {
  const colors = useThemePalette();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
