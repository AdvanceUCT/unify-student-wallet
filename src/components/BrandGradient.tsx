/**
 * @fileoverview Draws the shared UNIFY gradient behind branded surfaces.
 * @module components/BrandGradient
 */

import { LinearGradient } from "expo-linear-gradient";
import { type PropsWithChildren } from "react";
import { type StyleProp, type ViewStyle } from "react-native";

import { brandGradient } from "@/src/theme/brand";

export function BrandGradient({
  children,
  colors = brandGradient,
  style,
  testID,
}: PropsWithChildren<{
  colors?: readonly [string, string];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>) {
  return (
    <LinearGradient
      colors={colors}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={style}
      testID={testID}
    >
      {children}
    </LinearGradient>
  );
}
