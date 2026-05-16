import { router } from "expo-router";
import { useState } from "react";
import { Switch, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { Rule } from "@/src/components/Rule";
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
      <View style={{ gap: spacing["2xl"] }}>
        <ScreenHeader eyebrow="Settings" title="Wallet & security." />

        <View style={{ gap: spacing.md }}>
          <Text style={typography.eyebrow}>Security</Text>
          <Rule />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
              paddingVertical: spacing.md,
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
            <Text style={[typography.eyebrow, { color: colors.error }]}>{message}</Text>
          ) : null}
          <Rule variant="hairline" />
          <AppButton
            label="Change PIN"
            variant="outline"
            onPress={() => router.push("/(auth)/change-pin")}
          />
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={typography.eyebrow}>Wallet</Text>
          <View style={{ borderTopColor: colors.rule, borderTopWidth: 1 }}>
            <InfoRow
              label="Lock"
              value={session.lockStatus === "unlocked" ? "Unlocked" : "Locked"}
              tone={session.lockStatus === "unlocked" ? "success" : "warning"}
            />
            <InfoRow
              label="Wallet ID"
              value={session.walletId ? truncate(session.walletId) : "—"}
              divider={false}
            />
          </View>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <AppButton label="Lock wallet" onPress={lockWallet} />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton label="Sign out" variant="outline" onPress={signOut} />
            </View>
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={typography.eyebrow}>Agent</Text>
          <View style={{ borderTopColor: colors.rule, borderTopWidth: 1 }}>
            <InfoRow
              label="Holder agent"
              value={holderAgent.status}
              tone={holderAgent.status === "error" ? "error" : "success"}
            />
            <InfoRow
              label="Network"
              value="BCovrin Test"
              divider={false}
            />
          </View>
          {holderAgent.error ? (
            <Text style={[typography.eyebrow, { color: colors.error }]}>{holderAgent.error}</Text>
          ) : null}
        </View>
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
