import { View } from "react-native";

import { colors } from "@/src/theme/colors";
import { rules } from "@/src/theme/rules";

type RuleProps = {
  variant?: "full" | "inset" | "hairline";
  color?: string;
};

export function Rule({ variant = "hairline", color }: RuleProps) {
  const isHairline = variant === "hairline";
  const inset = variant === "inset";
  const height = isHairline ? rules.hairline : rules.ink;
  const backgroundColor = color ?? colors.rule;

  return (
    <View
      style={{
        height,
        backgroundColor,
        marginHorizontal: inset ? 16 : 0,
      }}
    />
  );
}
