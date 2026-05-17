import { StyleSheet, View } from "react-native";

import { colors } from "@/src/theme/colors";

export type PinDotStatus = "idle" | "error" | "success";

type PinDotsProps = {
  filled: number;
  length: number;
  status?: PinDotStatus;
};

export function PinDots({ filled, length, status = "idle" }: PinDotsProps) {
  const fillColor =
    status === "error" ? colors.error : status === "success" ? colors.primary : colors.ink;

  return (
    <View style={styles.row}>
      {Array.from({ length }, (_, i) => {
        const isFilled = i < filled;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: isFilled ? fillColor : colors.surfaceAlt,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    borderRadius: 999,
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
