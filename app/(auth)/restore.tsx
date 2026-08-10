import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppTextField } from "@/src/components/AppTextField";
import { Card } from "@/src/components/Card";
import { OperationStateScreen } from "@/src/components/OperationStateScreen";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import {
  pickEncryptedBackupFile,
  validateRecoveryPassword,
} from "@/src/features/wallet/walletBackup";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function RestoreWalletScreen() {
  const { restoreWallet } = useWalletSession();
  const [backup, setBackup] = useState<{ name: string; path: string } | null>(null);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  async function handleChooseFile() {
    try {
      setError(null);
      const selected = await pickEncryptedBackupFile();
      if (selected) setBackup(selected);
    } catch (pickerError) {
      setError(pickerError instanceof Error ? pickerError.message : "Backup file could not be opened.");
    }
  }

  async function handleRestore() {
    if (!backup) {
      setError("Choose a UNIFY wallet backup first.");
      return;
    }

    const validation = validateRecoveryPassword(recoveryPassword);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setError(null);
    setIsRestoring(true);
    const result = await restoreWallet(backup.path, recoveryPassword);
    setIsRestoring(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace("/(auth)/set-pin");
  }

  if (isRestoring) {
    return <OperationStateScreen busy tone="secure" eyebrow="Wallet recovery" title="Restoring encrypted wallet" message="Validating the backup and rebuilding secure wallet storage on this device." detail="Do not close UNIFY during recovery." />;
  }

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          eyebrow="Wallet recovery"
          title="Restore a backup."
          meta="Your credentials and connections will be copied into a new encrypted wallet on this device."
        />

        <Card heading="Encrypted backup">
          <View style={{ gap: spacing.md }}>
            <AppButton
              disabled={isRestoring}
              label={backup ? "Choose a different file" : "Choose backup file"}
              onPress={() => void handleChooseFile()}
              variant="outline"
            />
            {backup ? <Text style={typography.bodyStrong}>{backup.name}</Text> : null}
            <AppTextField
              accessibilityLabel="Recovery password"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isRestoring}
              onChangeText={setRecoveryPassword}
              placeholder="Recovery password"
              label="Recovery password"
              secureTextEntry
              value={recoveryPassword}
            />
            {error ? <Text style={[typography.body, { color: colors.error }]}>{error}</Text> : null}
            <AppButton
              disabled={isRestoring || !backup}
              label={isRestoring ? "Restoring wallet..." : "Restore wallet"}
              onPress={() => void handleRestore()}
            />
            <AppButton label="Cancel" onPress={() => router.back()} variant="ghost" />
          </View>
        </Card>
      </View>
    </AppScreen>
  );
}
