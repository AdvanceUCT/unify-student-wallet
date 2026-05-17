import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { PinDots, type PinDotStatus } from "@/src/features/auth/PinDots";
import { PinKeypad } from "@/src/features/auth/PinKeypad";
import { usePinEntry } from "@/src/features/auth/usePinEntry";
import { MAX_PIN_LENGTH, MIN_PIN_LENGTH } from "@/src/features/wallet/sessionTypes";
import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { shadows } from "@/src/theme/shadows";
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
          <View style={styles.handle} />
          <View style={{ gap: spacing.xs, marginBottom: spacing.xl }}>
            <Text style={typography.caption}>Security check</Text>
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
            <Text style={[typography.bodyStrong, { color: colors.inkMuted }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(15,20,17,0.45)",
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
    color: colors.error,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.rule,
    borderRadius: 999,
    height: 4,
    marginBottom: spacing.lg,
    width: 44,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: spacing["2xl"],
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    ...shadows.lg,
  },
});
