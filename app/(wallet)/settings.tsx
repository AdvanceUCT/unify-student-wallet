import { router } from "expo-router";
import { useState } from "react";
import { Switch, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { mockStudentProfile } from "@/src/lib/api/mockStudent";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function SettingsScreen() {
  const {
    biometricAvailable,
    biometricEnabled,
    lockWallet,
    session,
    setBiometricEnabled,
    signOut,
  } = useWalletSession();
  const [message, setMessage] = useState<string | null>(null);

  async function handleBiometricChange(enabled: boolean) {
    const result = await setBiometricEnabled(enabled);
    setMessage(result.ok ? null : result.error);
  }

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
          <InfoRow label="Wallet" value={session.walletId ?? "Not activated"} />
          <InfoRow label="Status" value={session.lockStatus === "locked" ? "Locked" : "Unlocked"} />
        </View>

        <View style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: spacing.md, padding: spacing.lg }}>
          <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={typography.sectionTitle}>Biometric unlock</Text>
              <Text style={typography.body}>
                {biometricAvailable ? "Use device biometrics after your PIN is set." : "Biometric unlock is unavailable on this device."}
              </Text>
            </View>
            <Switch disabled={!biometricAvailable} onValueChange={handleBiometricChange} value={biometricAvailable && biometricEnabled} />
          </View>
          {message ? <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>{message}</Text> : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppButton label="Change PIN" variant="secondary" onPress={() => router.push("/(auth)/change-pin")} />
          <AppButton label="Lock wallet" onPress={lockWallet} />
          <AppButton label="Sign out" variant="secondary" onPress={signOut} />
        </View>
      </View>
    </AppScreen>
  );
}
