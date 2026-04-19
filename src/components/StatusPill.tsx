import { Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

type StatusPillProps = {
  label: string;
  tone?: "success" | "warning";
};

export function StatusPill({ label, tone = "success" }: StatusPillProps) {
  const backgroundColor = tone === "success" ? colors.successSoft : colors.warningSoft;
  const color = tone === "success" ? colors.success : colors.warning;

  return (
    <View style={{ backgroundColor, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
      <Text style={{ color, fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>{label}</Text>
    </View>
  );
}
