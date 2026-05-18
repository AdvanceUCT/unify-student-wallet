import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import { Text, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { PinDots } from "@/src/features/auth/PinDots";
import { PinKeypad } from "@/src/features/auth/PinKeypad";
import { usePinEntry } from "@/src/features/auth/usePinEntry";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { MAX_PIN_LENGTH, MIN_PIN_LENGTH } from "@/src/features/wallet/sessionTypes";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

type Step = "enter" | "confirm";

export default function SetPinScreen() {
  const { createWallet } = useWalletSession();
  const [step, setStep] = useState<Step>("enter");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Store the first entry while the confirm keypad starts fresh.
  const firstPinRef = useRef("");

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
    const result = await createWallet(firstPinRef.current, confirmation);
    setIsSubmitting(false);

    if (!result.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error);
      clearConfirm();

      if (result.error === "PIN entries do not match.") {
        // A mismatch means starting both entries again is less confusing than partial retry.
        firstPinRef.current = "";
        setStep("enter");
      }
    }
  }

  const isEnterStep = step === "enter";

  return (
    <AppScreen>
      <View style={{ flex: 1, justifyContent: "space-between", paddingBottom: spacing.xl }}>
        <ScreenHeader
          eyebrow={isEnterStep ? "Step 1 of 2 · Create PIN" : "Step 2 of 2 · Confirm PIN"}
          title={isEnterStep ? "Choose a PIN." : "Re-enter the PIN."}
          meta={
            isEnterStep
              ? "Used to unlock this wallet on this device."
              : "Both entries must match exactly."
          }
        />

        <View style={{ alignItems: "center", gap: spacing.xl }}>
          <PinDots filled={isEnterStep ? pinFirst.length : pinConfirm.length} length={MAX_PIN_LENGTH} />

          {error !== null ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: colors.error, fontSize: 13, fontWeight: "600", textAlign: "center" }}
            >
              {error}
            </Text>
          ) : (
            <View style={{ height: 14 }} />
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
