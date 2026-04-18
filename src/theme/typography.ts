import { TextStyle } from "react-native";

import { colors } from "@/src/theme/colors";

export const typography = {
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  } satisfies TextStyle,
  brand: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0,
  } satisfies TextStyle,
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  } satisfies TextStyle,
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  } satisfies TextStyle,
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
  } satisfies TextStyle,
};
