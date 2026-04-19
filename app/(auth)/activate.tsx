import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { DEMO_ACTIVATION_CODE } from "@/src/features/wallet/sessionTypes";
import { mockStudentProfile } from "@/src/lib/api/mockStudent";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function ActivateScreen() {
  const { activateDemoWallet, isHydrated } = useWalletSession();
  const [activationCode, setActivationCode] = useState(DEMO_ACTIVATION_CODE);
  const [error, setError] = useState<string | null>(null);

  async function handleActivation() {
    const result = await activateDemoWallet(activationCode);
    setError(result.ok ? null : result.error);
  }

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
          <InfoRow label="Invitation" value="Demo code required" tone="warning" />
        </View>

        <View style={{ gap: spacing.sm }}>
          <TextInput
            accessibilityLabel="Activation code"
            autoCapitalize="characters"
            onChangeText={setActivationCode}
            placeholder="Activation code"
            placeholderTextColor={colors.muted}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              color: colors.text,
              fontSize: 16,
              padding: spacing.md,
            }}
            value={activationCode}
          />
          {error ? <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>{error}</Text> : null}
          <AppButton disabled={!isHydrated} label="Activate wallet" onPress={handleActivation} />
        </View>
      </View>
    </AppScreen>
  );
}
