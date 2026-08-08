import { router, useFocusEffect } from "expo-router";
import { Alert, Pressable, Switch, Text, View } from "react-native";
import { useCallback, useState, type PropsWithChildren } from "react";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { PinVerificationModal } from "@/src/features/auth/PinVerificationModal";
import { type ThemePreference, useThemePreference } from "@/src/features/theme/ThemePreferenceProvider";
import { getStoredCredentialsLazy } from "@/src/features/wallet/holderAgentRuntime";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { loadBackupMetadata, shouldRemindToBackUp, type BackupMetadata } from "@/src/features/wallet/walletBackup";
import { colors } from "@/src/theme/colors";
import { brandGradientEnd } from "@/src/theme/brand";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type PinVerificationPhase = "idle" | "verifying" | "error" | "success";
const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

function SettingsSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return <View style={{ gap: spacing.sm }}><Text style={typography.sectionTitle}>{title}</Text><View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule, paddingVertical: spacing.xs }}>{children}</View></View>;
}

function truncate(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function formatBackupDate(value?: string) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString();
}

export default function SettingsScreen() {
  const { preference: themePreference, setPreference: setThemePreference } = useThemePreference();
  const { biometricAvailable, biometricEnabled, confirmPinToDisableBiometric, lockWallet, session, setBiometricEnabled, signOut } = useWalletSession();
  const holderAgent = useHolderAgent();
  const [message, setMessage] = useState<string | null>(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinPhase, setPinPhase] = useState<PinVerificationPhase>("idle");
  const [pinError, setPinError] = useState<string | null>(null);
  const [backupMetadata, setBackupMetadata] = useState<BackupMetadata>({});
  const [credentialCount, setCredentialCount] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([loadBackupMetadata(), getStoredCredentialsLazy()]).then(([metadata, credentials]) => {
      if (active) { setBackupMetadata(metadata); setCredentialCount(credentials.length); }
    }).catch(() => undefined);
    return () => { active = false; };
  }, []));

  async function handleBiometricChange(enabled: boolean) {
    setMessage(null);
    if (!enabled) {
      const result = await setBiometricEnabled(false);
      if (!result.ok && "requiresPin" in result) { setPinError(null); setPinPhase("idle"); setPinModalVisible(true); return; }
      setMessage(result.ok ? null : result.error);
      return;
    }
    const result = await setBiometricEnabled(true);
    setMessage(result.ok ? null : result.error);
  }

  async function handleDisableBiometricPin(pin: string) {
    setPinPhase("verifying");
    const result = await confirmPinToDisableBiometric(pin);
    if (result.ok) {
      setPinError(null);
      setPinPhase("success");
      setTimeout(() => { setPinModalVisible(false); setPinPhase("idle"); }, 500);
      return;
    }
    setPinError(result.error);
    setPinPhase("error");
  }

  function confirmSignOut() {
    Alert.alert("Sign out of this wallet?", "Create a current backup first if you need to restore these credentials later.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <AppScreen>
      <ScreenHeader eyebrow="Profile" title="Wallet settings" meta="Security, recovery and connection status" />
      <View style={{ gap: spacing["2xl"] }}>
        <SettingsSection title="Appearance">
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: spacing.xs, paddingVertical: spacing.md }}>
            {THEME_OPTIONS.map((option) => {
              const selected = themePreference === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => void setThemePreference(option.value)}
                  style={({ pressed }) => ({
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected ? colors.primaryDeep : colors.surfaceAlt,
                    borderRadius: radii.sm,
                    borderWidth: 1,
                    borderColor: selected ? brandGradientEnd : colors.rule,
                    opacity: pressed ? 0.72 : 1,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.md,
                  })}
                >
                  <Text style={[typography.label, { color: selected ? colors.white : colors.ink }]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[typography.caption, { paddingBottom: spacing.md }]}>System follows your device appearance.</Text>
        </SettingsSection>

        <SettingsSection title="Security">
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}><Text style={typography.bodyStrong}>Biometric unlock</Text><Text style={typography.body}>{biometricAvailable ? "Use device biometrics after your PIN is set." : "Unavailable on this device."}</Text></View>
            <Switch accessibilityLabel="Toggle biometric unlock" disabled={!biometricAvailable || pinPhase === "verifying"} onValueChange={(value) => void handleBiometricChange(value)} trackColor={{ true: brandGradientEnd, false: colors.rule }} thumbColor={colors.surface} value={biometricAvailable && biometricEnabled} />
          </View>
          {message ? <Text accessibilityLiveRegion="polite" style={[typography.body, { color: colors.error, paddingBottom: spacing.md }]}>{message}</Text> : null}
          <View style={{ paddingBottom: spacing.md }}><AppButton label="Change PIN" variant="outline" onPress={() => router.push("/(auth)/change-pin")} /></View>
        </SettingsSection>

        <SettingsSection title="Recovery">
          <InfoRow label="Credentials protected" value={String(credentialCount)} divider />
          <InfoRow label="Last encrypted backup" tone={shouldRemindToBackUp(credentialCount, backupMetadata.lastBackupAt) ? "warning" : "success"} value={formatBackupDate(backupMetadata.lastBackupAt)} />
          {shouldRemindToBackUp(credentialCount, backupMetadata.lastBackupAt) ? <Text style={[typography.body, { color: colors.warning, paddingVertical: spacing.sm }]}>Your backup may not include the latest credentials.</Text> : null}
          <View style={{ paddingVertical: spacing.md }}><AppButton label="Create encrypted backup" onPress={() => router.push("/(wallet)/backup")} variant="outline" /></View>
        </SettingsSection>

        <SettingsSection title="Wallet information">
          <InfoRow label="Wallet" value={session.lockStatus === "unlocked" ? "Unlocked" : "Locked"} tone={session.lockStatus === "unlocked" ? "success" : "warning"} divider />
          <InfoRow label="Holder agent" value={holderAgent.status} tone={holderAgent.status === "error" ? "error" : "success"} divider />
          <InfoRow label="Network" value="BCovrin Test" divider />
          <InfoRow label="Wallet ID" value={session.walletId ? truncate(session.walletId) : "—"} />
        </SettingsSection>

        <SettingsSection title="Help">
          <View style={{ paddingVertical: spacing.md }}>
            <AppButton
              label="View wallet introduction"
              variant="outline"
              onPress={() => router.push({ pathname: "/(auth)/onboarding", params: { mode: "replay" } })}
            />
          </View>
        </SettingsSection>

        <View style={{ gap: spacing.md }}><AppButton label="Lock wallet" onPress={() => void lockWallet()} /><AppButton label="Sign out" variant="outline" onPress={confirmSignOut} /></View>
      </View>
      <PinVerificationModal errorMessage={pinError} onCancel={() => { setPinModalVisible(false); setPinError(null); setPinPhase("idle"); }} onSubmit={(pin) => void handleDisableBiometricPin(pin)} phase={pinPhase} visible={pinModalVisible} />
    </AppScreen>
  );
}
