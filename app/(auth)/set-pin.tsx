import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import { Text, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { PinDots } from "@/src/features/auth/PinDots";
import { PinKeypad } from "@/src/features/auth/PinKeypad";
import { usePinEntry } from "@/src/features/auth/usePinEntry";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { MAX_PIN_LENGTH, MIN_PIN_LENGTH } from "@/src/features/wallet/sessionTypes";
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

  const {
    append: appendFirst,
    backspace: backFirst,
    canSubmit: canSubmitFirst,
    clear: clearFirst,
    pin: pinFirst,
    submit: submitFirst,
  } = usePinEntry({
    maxLength: MAX_PIN_LENGTH,
    minLength: MIN_PIN_LENGTH,
    onComplete: (p) => {
      firstPinRef.current = p;
      clearFirst();
      setError(null);
      setStep("confirm");
    },
  });

  const {
    append: appendConfirm,
    backspace: backConfirm,
    canSubmit: canSubmitConfirm,
    clear: clearConfirm,
    pin: pinConfirm,
    submit: submitConfirm,
  } = usePinEntry({
    maxLength: MAX_PIN_LENGTH,
    minLength: MIN_PIN_LENGTH,
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
                ? "Set a 4 to 6 digit PIN before the credential is accepted into local wallet storage."
                : "Create a 4 to 6 digit PIN to protect this wallet."
              : "Re-enter your PIN to confirm."}
          </Text>
        </View>

        <View style={{ alignItems: "center", gap: spacing.lg }}>
          <PinDots filled={isEnterStep ? pinFirst.length : pinConfirm.length} length={MAX_PIN_LENGTH} />

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
            <PinKeypad
              canSubmit={canSubmitFirst}
              disabled={isSubmitting}
              onBackspace={backFirst}
              onDigit={appendFirst}
              onSubmit={submitFirst}
            />
          ) : (
            <PinKeypad
              canSubmit={canSubmitConfirm}
              disabled={isSubmitting}
              onBackspace={backConfirm}
              onDigit={appendConfirm}
              onSubmit={submitConfirm}
            />
          )}
        </View>
      </View>
    </AppScreen>
  );
}
