import { Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { rules } from "@/src/theme/rules";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type InfoRowProps = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "error";
  divider?: boolean;
};

export function InfoRow({ label, value, tone = "default", divider = false }: InfoRowProps) {
  const valueColor =
    tone === "success"
      ? colors.primary
      : tone === "warning"
        ? colors.warning
        : tone === "error"
          ? colors.error
          : colors.ink;

  return (
    <View
      style={{
        paddingVertical: spacing.md,
        borderBottomColor: colors.ruleSoft,
        borderBottomWidth: divider ? rules.hairline : 0,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
      }}
    >
      <Text style={[typography.body, { flex: 1 }]}>{label}</Text>
      <Text
        numberOfLines={1}
        ellipsizeMode="middle"
        style={[typography.bodyStrong, { color: valueColor, textAlign: "right", flexShrink: 1 }]}
      >
        {value}
      </Text>
    </View>
  );
}
