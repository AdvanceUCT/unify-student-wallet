import * as Haptics from "expo-haptics";
import { Delete as DeleteIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";

type PinKeypadProps = {
  canSubmit?: boolean;
  disabled?: boolean;
  onBackspace: () => void;
  onDigit: (digit: string) => void;
  onSubmit?: () => void;
};

const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
] as const;

export function PinKeypad({ canSubmit = false, disabled = false, onBackspace, onDigit, onSubmit }: PinKeypadProps) {
  function handleKey(key: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === "⌫") {
      onBackspace();
    } else {
      onDigit(key);
    }
  }

  return (
    <View style={styles.grid}>
      {ROWS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key, ci) => {
            if (key === "") {
              if (!onSubmit) {
                return <View key={ci} style={styles.cell} />;
              }
              const submitDisabled = disabled || !canSubmit;
              return (
                <Pressable
                  key={ci}
                  accessibilityLabel="Submit PIN"
                  accessibilityRole="button"
                  disabled={submitDisabled}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSubmit();
                  }}
                  style={({ pressed }) => [
                    styles.cell,
                    styles.submitCell,
                    { opacity: submitDisabled ? 0.35 : pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.submitLabel}>OK</Text>
                </Pressable>
              );
            }

            if (key === "⌫") {
              return (
                <Pressable
                  key={ci}
                  accessibilityLabel="Delete"
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={() => handleKey(key)}
                  style={({ pressed }) => [
                    styles.cell,
                    pressed && styles.pressed,
                    { opacity: disabled ? 0.4 : 1 },
                  ]}
                >
                  <DeleteIcon color={colors.ink} size={24} strokeWidth={1.6} />
                </Pressable>
              );
            }

            return (
              <Pressable
                key={ci}
                accessibilityLabel={key}
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => handleKey(key)}
                style={({ pressed }) => [
                  styles.cell,
                  pressed && styles.pressed,
                  { opacity: disabled ? 0.4 : 1 },
                ]}
              >
                <Text style={styles.digit}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const CELL = 72;

const styles = StyleSheet.create({
  cell: {
    alignItems: "center",
    borderRadius: 999,
    height: CELL,
    justifyContent: "center",
    width: CELL,
  },
  digit: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "500",
  },
  grid: { gap: 8 },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  row: { flexDirection: "row", gap: 20, justifyContent: "center" },
  submitCell: {
    backgroundColor: colors.primary,
  },
  submitLabel: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
});
