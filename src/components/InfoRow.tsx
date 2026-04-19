import { Text, View } from "react-native";

import { colors } from "@/src/theme/colors";

type InfoRowProps = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
};

export function InfoRow({ label, value, tone = "default" }: InfoRowProps) {
  const valueColor = tone === "success" ? colors.success : tone === "warning" ? colors.warning : colors.text;

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
      <Text style={{ color: colors.muted, flex: 1, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: valueColor, flex: 1, fontSize: 14, fontWeight: "700", textAlign: "right" }}>{value}</Text>
    </View>
  );
}
