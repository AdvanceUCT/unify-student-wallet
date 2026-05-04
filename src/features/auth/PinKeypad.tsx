import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";

type PinKeypadProps = {
  disabled?: boolean;
  onBackspace: () => void;
  onDigit: (digit: string) => void;
};

const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
] as const;

export function PinKeypad({ disabled = false, onBackspace, onDigit }: PinKeypadProps) {
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
          {row.map((key, ci) =>
            key === "" ? (
              <View key={ci} style={styles.cell} />
            ) : (
              <Pressable
                key={ci}
                accessibilityLabel={key === "⌫" ? "Delete" : key}
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => handleKey(key)}
                style={({ pressed }) => [styles.cell, styles.button, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
              >
                <Text style={styles.label}>{key}</Text>
              </Pressable>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

const CELL = 72;

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: CELL / 2,
    borderWidth: 1,
  },
  cell: {
    alignItems: "center",
    height: CELL,
    justifyContent: "center",
    width: CELL,
  },
  grid: { gap: 12 },
  label: { color: colors.text, fontSize: 22, fontWeight: "600" },
  row: { flexDirection: "row", gap: 20, justifyContent: "center" },
});
