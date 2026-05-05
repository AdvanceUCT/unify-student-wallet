import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { PinDots, type PinDotStatus } from "@/src/features/auth/PinDots";
import { PinKeypad } from "@/src/features/auth/PinKeypad";
import { usePinEntry } from "@/src/features/auth/usePinEntry";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { MAX_PIN_ATTEMPTS, MAX_PIN_LENGTH, MIN_PIN_LENGTH } from "@/src/features/wallet/sessionTypes";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type ScreenPhase = "idle" | "authenticating" | "error" | "success";

export default function UnlockScreen() {
  const { biometricAvailable, biometricEnabled, failedAttempts, isHardLocked, signOut, unlockWithBiometric, unlockWithPin } =
    useWalletSession();

  const [phase, setPhase] = useState<ScreenPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const biometricFired = useRef(false);
  const canUseBiometrics = biometricAvailable && biometricEnabled;

  const { append, backspace, canSubmit, clear, pin, submit } = usePinEntry({
    maxLength: MAX_PIN_LENGTH,
    minLength: MIN_PIN_LENGTH,
    onComplete: handlePinSubmit,
  });

  const dotStatus: PinDotStatus = phase === "error" ? "error" : phase === "success" ? "success" : "idle";
  const isInteractionDisabled = phase === "authenticating" || phase === "success";

  useEffect(() => {
    if (!biometricFired.current && canUseBiometrics && !isHardLocked) {
      biometricFired.current = true;
      void triggerBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function triggerBiometric() {
    setPhase("authenticating");
    const result = await unlockWithBiometric();

    if (result.ok) {
      setPhase("success");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setPhase("idle");
    }
  }

  async function handlePinSubmit(submittedPin: string) {
    setPhase("authenticating");
    const result = await unlockWithPin(submittedPin);

    if (result.ok) {
      setPhase("success");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setPhase("error");
    setErrorMessage(result.error);
    clear();
    setTimeout(() => setPhase("idle"), 800);
  }

  if (isHardLocked) {
    return (
      <AppScreen>
        <View style={{ flex: 1, justifyContent: "space-between", gap: spacing.xl }}>
          <View style={{ gap: spacing.sm }}>
            <Text style={typography.eyebrow}>Security</Text>
            <Text style={typography.title}>Wallet locked</Text>
            <Text style={typography.body}>
              Your wallet was locked after {MAX_PIN_ATTEMPTS} failed attempts. Sign out to reset access.
            </Text>
          </View>
          <AppButton label="Sign out" onPress={() => void signOut()} variant="secondary" />
        </View>
      </AppScreen>
    );
  }

  const attemptsRemaining = MAX_PIN_ATTEMPTS - failedAttempts;
  const showAttemptWarning = failedAttempts > 0;

  return (
    <AppScreen>
      <View style={{ flex: 1, justifyContent: "space-between", paddingBottom: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Locked</Text>
          <Text style={typography.title}>Unlock wallet</Text>
          <Text style={typography.body}>
            Enter your PIN{canUseBiometrics ? " or use biometrics" : ""} to access your student wallet.
          </Text>
        </View>

        <View style={{ alignItems: "center", gap: spacing.lg }}>
          <PinDots filled={pin.length} length={MAX_PIN_LENGTH} status={dotStatus} />

          {phase === "error" && errorMessage !== null ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: colors.warning, fontSize: 14, fontWeight: "700", textAlign: "center" }}
            >
              {errorMessage}
            </Text>
          ) : showAttemptWarning ? (
            <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700", textAlign: "center" }}>
              {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining
            </Text>
          ) : (
            <View style={{ height: 20 }} />
          )}

          <PinKeypad
            canSubmit={canSubmit}
            disabled={isInteractionDisabled}
            onBackspace={backspace}
            onDigit={append}
            onSubmit={submit}
          />

          {canUseBiometrics ? (
            <AppButton
              disabled={isInteractionDisabled}
              label="Use Face ID / Fingerprint"
              onPress={() => void triggerBiometric()}
              variant="secondary"
            />
          ) : null}
        </View>
      </View>
    </AppScreen>
  );
}
