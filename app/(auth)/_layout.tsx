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
