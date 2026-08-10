import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppTextField } from "@/src/components/AppTextField";
import { Card } from "@/src/components/Card";
import { OperationStateScreen } from "@/src/components/OperationStateScreen";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import {
  createAndShareEncryptedBackup,
  validateRecoveryPassword,
} from "@/src/features/wallet/walletBackup";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function BackupWalletScreen() {
  const colors = useThemePalette();
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

  if (isExporting) {
    return <OperationStateScreen busy tone="secure" eyebrow="Encrypted backup" title="Protecting your wallet" message="Encrypting credentials and connections with your recovery password." detail="The share sheet will open when the backup is ready." />;
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
            <AppTextField
              accessibilityLabel="Recovery password"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setRecoveryPassword}
              placeholder="At least 12 characters"
              label="Recovery password"
              secureTextEntry
              value={recoveryPassword}
            />
            <AppTextField
              accessibilityLabel="Confirm recovery password"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setConfirmation}
              placeholder="Confirm recovery password"
              label="Confirm recovery password"
              secureTextEntry
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
