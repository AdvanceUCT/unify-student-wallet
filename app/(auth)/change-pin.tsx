import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { PinDots } from "@/src/features/auth/PinDots";
import { PinKeypad } from "@/src/features/auth/PinKeypad";
import { usePinEntry } from "@/src/features/auth/usePinEntry";
import { validateNewPin } from "@/src/features/wallet/pin";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { MAX_CHANGE_PIN_ATTEMPTS, MAX_PIN_LENGTH, MIN_PIN_LENGTH } from "@/src/features/wallet/sessionTypes";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type ChangePinStep = "verify-current" | "enter-new" | "confirm-new";
type ChangePinPhase = "idle" | "verifying" | "error" | "success";

const STEP_CONFIG: Record<ChangePinStep, { eyebrow: string; title: string; meta: string }> = {
  "verify-current": {
    eyebrow: "Step 1 of 3 · Verify",
    title: "Current PIN.",
    meta: "Confirm your identity before changing the wallet PIN.",
  },
  "enter-new": {
    eyebrow: "Step 2 of 3 · New PIN",
    title: "Choose a new PIN.",
    meta: "Avoid sequences like 1234 or repeated digits like 1111.",
  },
  "confirm-new": {
    eyebrow: "Step 3 of 3 · Confirm",
    title: "Re-enter new PIN.",
    meta: "Both entries must match.",
  },
};

export default function ChangePinScreen() {
  const { changePin } = useWalletSession();
  const [step, setStep] = useState<ChangePinStep>("verify-current");
  const [phase, setPhase] = useState<ChangePinPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const currentPinRef = useRef("");
  const newPinRef = useRef("");

  const currentEntry = usePinEntry({
    maxLength: MAX_PIN_LENGTH,
    minLength: MIN_PIN_LENGTH,
    onComplete: (pin) => {
      currentPinRef.current = pin;
      setStep("enter-new");
    },
  });

  const newEntry = usePinEntry({
    maxLength: MAX_PIN_LENGTH,
    minLength: MIN_PIN_LENGTH,
    onComplete: (pin) => {
      const validation = validateNewPin(pin);
      if (!validation.ok) {
        setError(validation.error);
        setPhase("error");
        return;
      }
      newPinRef.current = pin;
      setStep("confirm-new");
    },
  });

  const confirmEntry = usePinEntry({
    maxLength: MAX_PIN_LENGTH,
    minLength: MIN_PIN_LENGTH,
    onComplete: async (confirmation) => {
      setPhase("verifying");
      const result = await changePin(currentPinRef.current, newPinRef.current, confirmation);

      if (result.ok) {
        setPhase("success");
        setTimeout(() => router.back(), 900);
        return;
      }

      const err = result.error;

      if (err.includes("Too many failed attempts")) {
        setIsLocked(true);
        return;
      }

      setError(err);
      setPhase("error");

      if (err.includes("Incorrect current PIN") || err.includes("No PIN is set")) {
        currentPinRef.current = "";
        setStep("verify-current");
        return;
      }

      if (err.includes("must be different") || err.includes("easy to guess")) {
        newPinRef.current = "";
        setStep("enter-new");
      }
    },
  });

  useEffect(() => {
    if (phase !== "error") return;
    const clearFn =
      step === "verify-current" ? currentEntry.clear : step === "enter-new" ? newEntry.clear : confirmEntry.clear;
    const t = setTimeout(() => {
      clearFn();
      setError(null);
      setPhase("idle");
    }, 600);
    return () => clearTimeout(t);
  }, [phase, step, currentEntry.clear, newEntry.clear, confirmEntry.clear]);

  if (isLocked) {
    return (
      <AppScreen>
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <ScreenHeader
            eyebrow="Change PIN · Locked"
            title="Too many attempts."
            meta={`Reached maximum of ${MAX_CHANGE_PIN_ATTEMPTS} failed attempts. Sign out and back in to try again.`}
          />
          <AppButton label="Go back" variant="outline" size="lg" onPress={() => router.back()} />
        </View>
      </AppScreen>
    );
  }

  const activeEntry =
    step === "verify-current" ? currentEntry : step === "enter-new" ? newEntry : confirmEntry;

  const config = STEP_CONFIG[step];
  const dotStatus = phase === "error" ? "error" : phase === "success" ? "success" : "idle";
  const isInteractionDisabled = phase === "verifying" || phase === "success";

  return (
    <AppScreen>
      <View style={{ flex: 1, justifyContent: "space-between", paddingBottom: spacing.xl }}>
        <ScreenHeader eyebrow={config.eyebrow} title={config.title} meta={config.meta} />

        <View style={{ alignItems: "center", gap: spacing.xl }}>
          <PinDots filled={activeEntry.pin.length} length={MAX_PIN_LENGTH} status={dotStatus} />

          <View style={{ height: 20, justifyContent: "center" }}>
            {phase === "error" && error ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[typography.eyebrow, { color: colors.error, textAlign: "center" }]}
              >
                {error}
              </Text>
            ) : null}
          </View>

          <PinKeypad
            canSubmit={activeEntry.canSubmit}
            disabled={isInteractionDisabled}
            onBackspace={activeEntry.backspace}
            onDigit={activeEntry.append}
            onSubmit={activeEntry.submit}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingVertical: spacing.sm })}
          >
            <Text style={[typography.eyebrow, { color: colors.inkMuted }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </AppScreen>
  );
}
