import { useEffect } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";

export function Skeleton({ height, width = "100%", radius = radii.sm, style }: {
  height: number;
  width?: ViewStyle["width"];
  radius?: number;
  style?: ViewStyle;
}) {
  const opacity = useSharedValue(0.42);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!reducedMotion) {
      opacity.value = withRepeat(withTiming(0.8, { duration: 850, reduceMotion: ReduceMotion.System }), -1, true);
    }
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: colors.rule }, animatedStyle, style]} />;
}

export function CredentialSkeleton() {
  return (
    <View style={{ gap: spacing.md }} accessibilityLabel="Loading credential" accessibilityRole="progressbar">
      <Skeleton height={210} radius={radii.xl} />
      <Skeleton height={18} width="48%" />
      <Skeleton height={14} width="72%" />
    </View>
  );
}
