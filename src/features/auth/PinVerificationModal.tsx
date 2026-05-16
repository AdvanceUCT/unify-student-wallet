import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { PinDots, type PinDotStatus } from "@/src/features/auth/PinDots";
import { PinKeypad } from "@/src/features/auth/PinKeypad";
import { usePinEntry } from "@/src/features/auth/usePinEntry";
import { MAX_PIN_LENGTH, MIN_PIN_LENGTH } from "@/src/features/wallet/sessionTypes";
import { colors } from "@/src/theme/colors";
import { rules } from "@/src/theme/rules";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type PinVerificationPhase = "idle" | "verifying" | "error" | "success";

type PinVerificationModalProps = {
  errorMessage: string | null;
  onCancel: () => void;
  onSubmit: (pin: string) => void;
  phase: PinVerificationPhase;
  visible: boolean;
};

export function PinVerificationModal({ errorMessage, onCancel, onSubmit, phase, visible }: PinVerificationModalProps) {
  const { append, backspace, clear, pin } = usePinEntry({
    maxLength: MAX_PIN_LENGTH,
    minLength: MIN_PIN_LENGTH,
    onComplete: onSubmit,
  });

  useEffect(() => {
    if (!visible) {
      clear();
    }
  }, [visible, clear]);

  useEffect(() => {
    if (phase === "error") {
      const timeout = setTimeout(() => clear(), 600);
      return () => clearTimeout(timeout);
    }
  }, [phase, clear]);

  const dotStatus: PinDotStatus = phase === "error" ? "error" : phase === "success" ? "success" : "idle";
  const isInteractionDisabled = phase === "verifying" || phase === "success";

  return (
    <Modal animationType="slide" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
            <Text style={typography.eyebrow}>Security · Confirm</Text>
            <Text style={typography.title}>Enter your PIN</Text>
            <Text style={typography.body}>Confirm your PIN to disable biometric unlock.</Text>
          </View>

          <View style={{ alignItems: "center", gap: spacing.lg }}>
            <PinDots filled={pin.length} length={MAX_PIN_LENGTH} status={dotStatus} />

            <View style={styles.errorContainer}>
              {phase === "error" && errorMessage ? (
                <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                  {errorMessage}
                </Text>
              ) : null}
            </View>

            <PinKeypad
              canSubmit={pin.length >= MIN_PIN_LENGTH}
              disabled={isInteractionDisabled}
              onBackspace={backspace}
              onDigit={append}
              onSubmit={() => onSubmit(pin)}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelButton, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Text style={[typography.eyebrow, { color: colors.inkMuted }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(14,26,20,0.55)",
    flex: 1,
    justifyContent: "flex-end",
  },
  cancelButton: {
    alignItems: "center",
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  errorContainer: {
    height: 20,
    justifyContent: "center",
  },
  errorText: {
    ...typography.eyebrow,
    color: colors.error,
    textAlign: "center",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopColor: colors.rule,
    borderTopWidth: rules.ink,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
});
