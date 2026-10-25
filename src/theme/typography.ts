/**
 * @fileoverview Defines semantic text styles for light and dark themes.
 * @module theme/typography
 */

import { type TextStyle } from "react-native";

import { colors } from "@/src/theme/colors";

const sans = "IBMPlexSans_400Regular";
const sansSemiBold = "IBMPlexSans_600SemiBold";
const sansBold = "IBMPlexSans_700Bold";
const mono = "IBMPlexMono_500Medium";

const baseTypography = {
  display: { fontFamily: sansBold, fontSize: 34, lineHeight: 40 } satisfies TextStyle,
  title: { fontFamily: sansBold, fontSize: 27, lineHeight: 34 } satisfies TextStyle,
  heading: { fontFamily: sansSemiBold, fontSize: 20, lineHeight: 27 } satisfies TextStyle,
  sectionTitle: { fontFamily: sansSemiBold, fontSize: 18, lineHeight: 24 } satisfies TextStyle,
  bodyLg: { fontFamily: sans, fontSize: 16, lineHeight: 24 } satisfies TextStyle,
  body: { fontFamily: sans, fontSize: 15, lineHeight: 22 } satisfies TextStyle,
  bodyStrong: { fontFamily: sansSemiBold, fontSize: 15, lineHeight: 22 } satisfies TextStyle,
  label: { fontFamily: sansSemiBold, fontSize: 13, lineHeight: 18 } satisfies TextStyle,
  caption: { fontFamily: sans, fontSize: 12, lineHeight: 17 } satisfies TextStyle,
  eyebrow: { fontFamily: sansSemiBold, fontSize: 12, lineHeight: 16, textTransform: "uppercase" } satisfies TextStyle,
  brand: { fontFamily: sansBold, fontSize: 12, lineHeight: 16, textTransform: "uppercase" } satisfies TextStyle,
  mono: { fontFamily: mono, fontSize: 14, lineHeight: 20 } satisfies TextStyle,
  monoLg: { fontFamily: mono, fontSize: 20, lineHeight: 26 } satisfies TextStyle,
};

type Typography = typeof baseTypography;
const tone: Record<keyof Typography, keyof typeof colors> = {
  display: "ink",
  title: "ink",
  heading: "ink",
  sectionTitle: "ink",
  bodyLg: "ink",
  body: "inkMuted",
  bodyStrong: "ink",
  label: "ink",
  caption: "inkSubtle",
  eyebrow: "primary",
  brand: "primary",
  mono: "ink",
  monoLg: "ink",
};

export const typography = {} as Typography;
for (const key of Object.keys(baseTypography) as (keyof Typography)[]) {
  Object.defineProperty(typography, key, {
    enumerable: true,
    get: () => ({ ...baseTypography[key], color: colors[tone[key]] }),
  });
}
