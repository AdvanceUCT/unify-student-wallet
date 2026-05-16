import { StyleSheet, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { rules } from "@/src/theme/rules";

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
      {Array.from({ length }, (_, i) => (
        <View
          key={i}
          style={[
            styles.cell,
            {
              borderColor: fillColor,
              backgroundColor: i < filled ? fillColor : "transparent",
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderWidth: rules.ink,
    height: 18,
    width: 18,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "center",
    paddingVertical: 12,
  },
});
