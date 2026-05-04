import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { PinDots } from "@/src/features/auth/PinDots";
import { PinKeypad } from "@/src/features/auth/PinKeypad";
import { usePinEntry } from "@/src/features/auth/usePinEntry";
import { validateNewPin } from "@/src/features/wallet/pin";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { MAX_CHANGE_PIN_ATTEMPTS, PIN_LENGTH } from "@/src/features/wallet/sessionTypes";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type ChangePinStep = "verify-current" | "enter-new" | "confirm-new";
type ChangePinPhase = "idle" | "verifying" | "error" | "success";

const STEP_CONFIG: Record<ChangePinStep, { eyebrow: string; title: string; body: string }> = {
  "verify-current": {
    eyebrow: "Step 1 of 3",
    title: "Enter current PIN",
    body: "Confirm your identity before changing your wallet PIN.",
  },
  "enter-new": {
    eyebrow: "Step 2 of 3",
    title: "Enter new PIN",
    body: "Choose a new 4 to 6 digit PIN. Avoid sequences like 1234 or repeated digits like 1111.",
  },
  "confirm-new": {
    eyebrow: "Step 3 of 3",
    title: "Confirm new PIN",
    body: "Re-enter your new PIN to prevent typos.",
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
    length: PIN_LENGTH,
    onComplete: (pin) => {
      currentPinRef.current = pin;
      setStep("enter-new");
    },
  });

  const newEntry = usePinEntry({
    length: PIN_LENGTH,
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
    length: PIN_LENGTH,
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

  // After 600 ms of error display, clear the active entry's pin and reset phase.
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
        <View style={{ alignItems: "center", flex: 1, gap: spacing.xl, justifyContent: "center" }}>
          <View style={{ alignItems: "center", gap: spacing.sm }}>
            <Text style={typography.eyebrow}>Change PIN locked</Text>
            <Text style={typography.title}>Too many attempts</Text>
            <Text style={[typography.body, { textAlign: "center" }]}>
              {`You have reached the maximum of ${MAX_CHANGE_PIN_ATTEMPTS} failed attempts. Sign out and sign back in to try again.`}
            </Text>
          </View>
          <AppButton label="Go back" variant="secondary" onPress={() => router.back()} />
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
      <View style={{ alignItems: "center", flex: 1, gap: spacing.xl, justifyContent: "center" }}>
        <View style={{ alignItems: "center", gap: spacing.sm }}>
          <Text style={typography.eyebrow}>{config.eyebrow}</Text>
          <Text style={typography.title}>{config.title}</Text>
          <Text style={[typography.body, { textAlign: "center" }]}>{config.body}</Text>
        </View>

        <PinDots filled={activeEntry.pin.length} length={PIN_LENGTH} status={dotStatus} />

        <View style={{ height: 20, justifyContent: "center" }}>
          {phase === "error" && error ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: colors.warning, fontSize: 14, fontWeight: "700", textAlign: "center" }}
            >
              {error}
            </Text>
          ) : null}
        </View>

        <PinKeypad disabled={isInteractionDisabled} onBackspace={activeEntry.backspace} onDigit={activeEntry.append} />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: spacing.sm })}
        >
          <Text style={{ color: colors.muted, fontSize: 16, fontWeight: "600" }}>Cancel</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}
