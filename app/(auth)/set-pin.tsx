import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import { Text, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { PinDots } from "@/src/features/auth/PinDots";
import { PinKeypad } from "@/src/features/auth/PinKeypad";
import { usePinEntry } from "@/src/features/auth/usePinEntry";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { PIN_LENGTH } from "@/src/features/wallet/sessionTypes";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type Step = "enter" | "confirm";

export default function SetPinScreen() {
  const { session, setPin } = useWalletSession();
  const [step, setStep] = useState<Step>("enter");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstPinRef = useRef("");

  const isActivationPending = session.activationStatus === "activationPending";

  const { append: appendFirst, backspace: backFirst, clear: clearFirst, pin: pinFirst } = usePinEntry({
    length: PIN_LENGTH,
    onComplete: (p) => {
      firstPinRef.current = p;
      clearFirst();
      setError(null);
      setStep("confirm");
    },
  });

  const { append: appendConfirm, backspace: backConfirm, clear: clearConfirm, pin: pinConfirm } = usePinEntry({
    length: PIN_LENGTH,
    onComplete: (p) => {
      void handleConfirm(p);
    },
  });

  async function handleConfirm(confirmation: string) {
    setIsSubmitting(true);
    const result = await setPin(firstPinRef.current, confirmation);
    setIsSubmitting(false);

    if (!result.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error);
      clearConfirm();

      if (result.error === "PIN entries do not match.") {
        firstPinRef.current = "";
        setStep("enter");
      }
    }
  }

  const isEnterStep = step === "enter";

  return (
    <AppScreen>
      <View style={{ flex: 1, justifyContent: "space-between", paddingBottom: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Wallet security</Text>
          <Text style={typography.title}>{isEnterStep ? "Set your PIN" : "Confirm your PIN"}</Text>
          <Text style={typography.body}>
            {isEnterStep
              ? isActivationPending
                ? "Set a 6-digit PIN before the credential is accepted into local wallet storage."
                : "Create a 6-digit PIN to protect this wallet."
              : "Re-enter your PIN to confirm."}
          </Text>
        </View>

        <View style={{ alignItems: "center", gap: spacing.lg }}>
          <PinDots filled={isEnterStep ? pinFirst.length : pinConfirm.length} length={PIN_LENGTH} />

          {error !== null ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: colors.warning, fontSize: 14, fontWeight: "700", textAlign: "center" }}
            >
              {error}
            </Text>
          ) : (
            <View style={{ height: 20 }} />
          )}

          {isEnterStep ? (
            <PinKeypad disabled={isSubmitting} onBackspace={backFirst} onDigit={appendFirst} />
          ) : (
            <PinKeypad disabled={isSubmitting} onBackspace={backConfirm} onDigit={appendConfirm} />
          )}
        </View>
      </View>
    </AppScreen>
  );
}
