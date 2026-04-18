import { router } from "expo-router";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { mockStudentProfile } from "@/src/lib/api/mockStudent";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function ActivateScreen() {
  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Activation</Text>
          <Text style={typography.title}>Connect your student credential</Text>
          <Text style={typography.body}>
            Use the invitation from your university to activate your wallet.
          </Text>
        </View>

        <View
          style={{
            borderColor: colors.border,
            borderRadius: 8,
            borderWidth: 1,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <InfoRow label="Student" value={mockStudentProfile.name} />
          <InfoRow label="Institution" value={mockStudentProfile.institution} />
          <InfoRow label="Invitation" value="Pending" tone="warning" />
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppButton label="Use demo credential" onPress={() => router.replace("/(wallet)/home")} />
          <AppButton label="Back to sign in" variant="secondary" onPress={() => router.back()} />
        </View>
      </View>
    </AppScreen>
  );
}
