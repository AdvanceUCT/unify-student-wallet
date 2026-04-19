import { router } from "expo-router";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { mockStudentProfile } from "@/src/lib/api/mockStudent";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function SettingsScreen() {
  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Settings</Text>
          <Text style={typography.title}>Wallet details</Text>
          <Text style={typography.body}>Manage the demo wallet state and account context.</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <InfoRow label="Name" value={mockStudentProfile.name} />
          <InfoRow label="Institution" value={mockStudentProfile.institution} />
          <InfoRow label="Environment" value="Demo" />
        </View>

        <AppButton label="Sign out" variant="secondary" onPress={() => router.replace("/(auth)/sign-in")} />
      </View>
    </AppScreen>
  );
}
