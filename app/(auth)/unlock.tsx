import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function UnlockScreen() {
  const { biometricAvailable, biometricEnabled, unlockWithBiometric, unlockWithPin } = useWalletSession();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handlePinUnlock() {
    const result = await unlockWithPin(pin);
    setError(result.ok ? null : result.error);
  }

  async function handleBiometricUnlock() {
    const result = await unlockWithBiometric();
    setError(result.ok ? null : result.error);
  }

  return (
    <AppScreen>
      <View style={{ flex: 1, justifyContent: "space-between", gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Locked</Text>
          <Text style={typography.title}>Unlock wallet</Text>
          <Text style={typography.body}>Enter your PIN before presenting credentials or approving service requests.</Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <TextInput
            accessibilityLabel="Unlock PIN"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setPin}
            placeholder="PIN"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              color: colors.text,
              fontSize: 16,
              padding: spacing.md,
            }}
            value={pin}
          />
          {error ? <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>{error}</Text> : null}
          <AppButton label="Unlock with PIN" onPress={handlePinUnlock} />
          {biometricAvailable && biometricEnabled ? (
            <AppButton label="Use biometric unlock" variant="secondary" onPress={handleBiometricUnlock} />
          ) : null}
        </View>
      </View>
    </AppScreen>
  );
}
