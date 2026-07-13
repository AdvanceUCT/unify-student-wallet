import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import {
  createAndShareEncryptedBackup,
  validateRecoveryPassword,
} from "@/src/features/wallet/walletBackup";
import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const inputStyle = {
  backgroundColor: colors.surfaceAlt,
  borderRadius: radii.md,
  color: colors.ink,
  fontSize: 16,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
};

export default function BackupWalletScreen() {
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function handleBackup() {
    const validation = validateRecoveryPassword(recoveryPassword, confirmation);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setError(null);
    setIsExporting(true);

    try {
      await createAndShareEncryptedBackup(recoveryPassword);
      router.back();
    } catch (backupError) {
      setError(backupError instanceof Error ? backupError.message : "Wallet backup could not be created.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          eyebrow="Wallet backup"
          title="Protect your wallet."
          meta="Choose a recovery password you can remember. It cannot be recovered by UNIFY."
        />

        <Card heading="Recovery password">
          <View style={{ gap: spacing.md }}>
            <TextInput
              accessibilityLabel="Recovery password"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setRecoveryPassword}
              placeholder="At least 12 characters"
              placeholderTextColor={colors.inkSubtle}
              secureTextEntry
              style={inputStyle}
              value={recoveryPassword}
            />
            <TextInput
              accessibilityLabel="Confirm recovery password"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setConfirmation}
              placeholder="Confirm recovery password"
              placeholderTextColor={colors.inkSubtle}
              secureTextEntry
              style={inputStyle}
              value={confirmation}
            />
            {error ? <Text style={[typography.body, { color: colors.error }]}>{error}</Text> : null}
            <AppButton
              disabled={isExporting}
              label={isExporting ? "Encrypting wallet..." : "Create encrypted backup"}
              onPress={() => void handleBackup()}
            />
            <AppButton label="Cancel" onPress={() => router.back()} variant="ghost" />
          </View>
        </Card>
      </View>
    </AppScreen>
  );
}
