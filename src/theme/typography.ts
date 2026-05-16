import { TextStyle } from "react-native";

import { colors } from "@/src/theme/colors";

export const typography = {
  display: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1,
    color: colors.ink,
  } satisfies TextStyle,
  title: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: colors.ink,
  } satisfies TextStyle,
  heading: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
  } satisfies TextStyle,
  sectionTitle: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
  } satisfies TextStyle,
  bodyLg: {
    fontFamily: "IBMPlexSans_400Regular",
    fontSize: 17,
    lineHeight: 26,
    color: colors.ink,
  } satisfies TextStyle,
  body: {
    fontFamily: "IBMPlexSans_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkMuted,
  } satisfies TextStyle,
  bodyStrong: {
    fontFamily: "IBMPlexSans_500Medium",
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  } satisfies TextStyle,
  eyebrow: {
    fontFamily: "IBMPlexMono_500Medium",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.primary,
  } satisfies TextStyle,
  brand: {
    fontFamily: "IBMPlexMono_500Medium",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.primary,
  } satisfies TextStyle,
  mono: {
    fontFamily: "IBMPlexMono_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
  } satisfies TextStyle,
  monoLg: {
    fontFamily: "IBMPlexMono_500Medium",
    fontSize: 22,
    lineHeight: 26,
    color: colors.ink,
  } satisfies TextStyle,
  caption: {
    fontFamily: "IBMPlexSans_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: colors.inkSubtle,
  } satisfies TextStyle,
};
