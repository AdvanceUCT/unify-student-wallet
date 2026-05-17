import { TextStyle } from "react-native";

import { colors } from "@/src/theme/colors";

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colors.ink,
  } satisfies TextStyle,
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.ink,
  } satisfies TextStyle,
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: colors.ink,
  } satisfies TextStyle,
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: colors.ink,
  } satisfies TextStyle,
  bodyLg: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
    color: colors.ink,
  } satisfies TextStyle,
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
    color: colors.inkMuted,
  } satisfies TextStyle,
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: colors.ink,
  } satisfies TextStyle,
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.ink,
  } satisfies TextStyle,
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    color: colors.inkSubtle,
  } satisfies TextStyle,
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.primary,
  } satisfies TextStyle,
  brand: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.primary,
  } satisfies TextStyle,
  mono: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: colors.ink,
  } satisfies TextStyle,
  monoLg: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: colors.ink,
  } satisfies TextStyle,
};
