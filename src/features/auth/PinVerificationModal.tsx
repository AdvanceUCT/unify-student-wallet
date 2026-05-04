import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { PinDots, type PinDotStatus } from "@/src/features/auth/PinDots";
import { PinKeypad } from "@/src/features/auth/PinKeypad";
import { usePinEntry } from "@/src/features/auth/usePinEntry";
import { PIN_LENGTH } from "@/src/features/wallet/sessionTypes";
import { colors } from "@/src/theme/colors";
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
    length: PIN_LENGTH,
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

          <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
            <Text style={typography.eyebrow}>Security check</Text>
            <Text style={typography.title}>Enter your PIN</Text>
            <Text style={typography.body}>Confirm your PIN to disable biometric unlock.</Text>
          </View>

          <View style={{ alignItems: "center", gap: spacing.lg }}>
            <PinDots filled={pin.length} length={PIN_LENGTH} status={dotStatus} />

            <View style={styles.errorContainer}>
              {phase === "error" && errorMessage ? (
                <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                  {errorMessage}
                </Text>
              ) : null}
            </View>

            <PinKeypad disabled={isInteractionDisabled} onBackspace={backspace} onDigit={append} />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelButton, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.4)",
    flex: 1,
    justifyContent: "flex-end",
  },
  cancelButton: {
    alignItems: "center",
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  cancelText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    height: 20,
    justifyContent: "center",
  },
  errorText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: 2,
    height: 4,
    marginBottom: spacing.lg,
    width: 40,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
