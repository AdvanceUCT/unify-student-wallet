import { Text, View } from "react-native";

import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
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
  const colors = useThemePalette();
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
        alignItems: "flex-start",
        gap: spacing.md,
      }}
    >
      <Text style={[typography.body, { flex: 1 }]}>{label}</Text>
      <Text selectable style={[typography.bodyStrong, { color: valueColor, textAlign: "right", flex: 1, flexShrink: 1 }]}>
        {value}
      </Text>
    </View>
  );
}
