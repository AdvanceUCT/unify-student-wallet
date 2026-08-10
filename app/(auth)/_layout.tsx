/**
 * @fileoverview Defines the navigation stack used before the wallet is unlocked.
 * @module app/(auth)/_layout
 */

import { Stack } from "expo-router";

import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";

export default function AuthLayout() {
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
