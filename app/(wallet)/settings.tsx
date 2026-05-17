import { router } from "expo-router";
import { useState } from "react";
import { Switch, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { PinVerificationModal } from "@/src/features/auth/PinVerificationModal";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type PinVerificationPhase = "idle" | "verifying" | "error" | "success";

function truncate(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export default function SettingsScreen() {
  const {
    biometricAvailable,
    biometricEnabled,
    confirmPinToDisableBiometric,
    lockWallet,
    session,
    setBiometricEnabled,
    signOut,
  } = useWalletSession();
  const holderAgent = useHolderAgent();
  const [message, setMessage] = useState<string | null>(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinPhase, setPinPhase] = useState<PinVerificationPhase>("idle");
  const [pinError, setPinError] = useState<string | null>(null);

  async function handleBiometricChange(enabled: boolean) {
    setMessage(null);

    if (!enabled) {
      // Disabling biometrics can require PIN proof, depending on how the session was saved.
      const result = await setBiometricEnabled(false);

      if (!result.ok && "requiresPin" in result) {
        setPinError(null);
        setPinPhase("idle");
        setPinModalVisible(true);
        return;
      }

      setMessage(result.ok ? null : result.error);
      return;
    }

    const result = await setBiometricEnabled(enabled);
    setMessage(result.ok ? null : result.error);
  }

  async function handleDisableBiometricPin(pin: string) {
    setPinPhase("verifying");
    const result = await confirmPinToDisableBiometric(pin);

    if (result.ok) {
      setPinError(null);
      setPinPhase("success");
      // Give the success state a beat before closing the PIN modal.
      setTimeout(() => {
        setPinModalVisible(false);
        setPinPhase("idle");
      }, 500);
      return;
    }

    setPinError(result.error);
    setPinPhase("error");
  }

  function handleCancelPinVerification() {
    setPinModalVisible(false);
    setPinError(null);
    setPinPhase("idle");
  }

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader eyebrow="Settings" title="Wallet & security." />

        <Card heading="Security">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
              paddingVertical: spacing.sm,
            }}
          >
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={typography.bodyStrong}>Biometric unlock</Text>
              <Text style={typography.body}>
                {biometricAvailable
                  ? "Use device biometrics after your PIN is set."
                  : "Biometric unlock is unavailable on this device."}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Toggle biometric unlock"
              disabled={!biometricAvailable || pinPhase === "verifying"}
              onValueChange={handleBiometricChange}
              trackColor={{ true: colors.primary, false: colors.ruleSoft }}
              thumbColor={colors.surface}
              value={biometricAvailable && biometricEnabled}
            />
          </View>
          {message ? (
            <Text style={[typography.body, { color: colors.error, marginTop: spacing.sm }]}>
              {message}
            </Text>
          ) : null}
          <View style={{ marginTop: spacing.md }}>
            <AppButton
              label="Change PIN"
              variant="outline"
              onPress={() => router.push("/(auth)/change-pin")}
            />
          </View>
        </Card>

        <Card heading="Wallet">
          <InfoRow
            label="Lock"
            value={session.lockStatus === "unlocked" ? "Unlocked" : "Locked"}
            tone={session.lockStatus === "unlocked" ? "success" : "warning"}
            divider
          />
          <InfoRow
            label="Wallet ID"
            value={session.walletId ? truncate(session.walletId) : "—"}
          />
          <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <AppButton label="Lock wallet" onPress={lockWallet} />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label="Sign out" variant="outline" onPress={signOut} />
            </View>
          </View>
        </Card>

        <Card heading="Agent">
          <InfoRow
            label="Holder agent"
            value={holderAgent.status}
            tone={holderAgent.status === "error" ? "error" : "success"}
            divider
          />
          <InfoRow label="Network" value="BCovrin Test" />
          {holderAgent.error ? (
            <Text style={[typography.body, { color: colors.error, marginTop: spacing.sm }]}>
              {holderAgent.error}
            </Text>
          ) : null}
        </Card>
      </View>
      <PinVerificationModal
        errorMessage={pinError}
        onCancel={handleCancelPinVerification}
        onSubmit={(pin) => void handleDisableBiometricPin(pin)}
        phase={pinPhase}
        visible={pinModalVisible}
      />
    </AppScreen>
  );
}
