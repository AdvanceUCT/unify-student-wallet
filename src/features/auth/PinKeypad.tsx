import * as Haptics from "expo-haptics";
import { Delete as DeleteIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { rules } from "@/src/theme/rules";
import { typography } from "@/src/theme/typography";

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
                    { opacity: submitDisabled ? 0.35 : pressed ? 0.7 : 1 },
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
                    { opacity: disabled ? 0.4 : pressed ? 0.5 : 1 },
                  ]}
                >
                  <DeleteIcon color={colors.ink} size={24} strokeWidth={1.5} />
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
                  { opacity: disabled ? 0.4 : pressed ? 0.5 : 1 },
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
    height: CELL,
    justifyContent: "center",
    width: CELL,
  },
  digit: {
    ...typography.title,
    fontSize: 28,
    lineHeight: 32,
  },
  grid: {
    borderColor: colors.rule,
    borderTopWidth: rules.ink,
    borderBottomWidth: rules.ink,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 0,
    borderBottomColor: colors.ruleSoft,
    borderBottomWidth: rules.hairline,
  },
  submitCell: {
    backgroundColor: colors.primary,
  },
  submitLabel: {
    ...typography.eyebrow,
    color: colors.surface,
    fontSize: 13,
    letterSpacing: 1.6,
  },
});
