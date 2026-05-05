import { StyleSheet, View } from "react-native";

import { colors } from "@/src/theme/colors";

export type PinDotStatus = "idle" | "error" | "success";

type PinDotsProps = {
  filled: number;
  length: number;
  status?: PinDotStatus;
};

export function PinDots({ filled, length, status = "idle" }: PinDotsProps) {
  const fillColor = status === "error" ? colors.warning : status === "success" ? colors.success : colors.primary;

  return (
    <View style={styles.row}>
      {Array.from({ length }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, { borderColor: fillColor, backgroundColor: i < filled ? fillColor : "transparent" }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    width: 14,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "center",
    paddingVertical: 12,
  },
});
