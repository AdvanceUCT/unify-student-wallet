import { Stack } from "expo-router";

import { colors } from "@/src/theme/colors";

export default function CredentialStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
