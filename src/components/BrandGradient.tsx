import { LinearGradient } from "expo-linear-gradient";
import { type PropsWithChildren } from "react";
import { type StyleProp, type ViewStyle } from "react-native";

import { brandGradient } from "@/src/theme/brand";

export function BrandGradient({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <LinearGradient
      colors={brandGradient}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
