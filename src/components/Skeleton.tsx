import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/src/theme/colors";
import { studentCardAspectRatio, studentCardMaxWidth } from "@/src/theme/layout";
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
  const shouldAnimate = process.env.NODE_ENV !== "test" && !reducedMotion;

  useEffect(() => {
    cancelAnimation(opacity);
    opacity.value = shouldAnimate
      ? withRepeat(
          withTiming(0.8, {
            duration: 850,
            reduceMotion: ReduceMotion.System,
          }),
          -1,
          true,
        )
      : 0.5;
    return () => cancelAnimation(opacity);
  }, [opacity, shouldAnimate]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: colors.rule }, animatedStyle, style]} />;
}

export function CredentialSkeleton() {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(windowWidth - spacing.xl * 2, studentCardMaxWidth);
  const cardHeight = cardWidth / studentCardAspectRatio;
  const shimmer = useSharedValue(-cardWidth);
  const reducedMotion = useReducedMotion();
  const shouldAnimate = process.env.NODE_ENV !== "test" && !reducedMotion;

  useEffect(() => {
    cancelAnimation(shimmer);
    shimmer.value = -cardWidth;
    if (shouldAnimate) {
      shimmer.value = withRepeat(
        withTiming(cardWidth, { duration: 1300, reduceMotion: ReduceMotion.System }),
        -1,
        false,
      );
    }
    return () => cancelAnimation(shimmer);
  }, [cardWidth, shimmer, shouldAnimate]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value }],
  }));

  return (
    <View
      accessibilityLabel="Loading credential"
      accessibilityRole="progressbar"
      style={[
        styles.credential,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.rule, height: cardHeight, width: cardWidth },
      ]}
    >
      <View style={styles.skeletonContent}>
        <Skeleton height={12} width="50%" />
        <View style={{ gap: spacing.md }}>
          <Skeleton height={24} width="62%" />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Skeleton height={29} width="40%" />
            <Skeleton height={29} width="25%" />
          </View>
        </View>
      </View>
      {shouldAnimate ? (
        <Animated.View pointerEvents="none" style={[styles.shimmer, { width: cardWidth * 0.5 }, shimmerStyle]}>
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.32)", "transparent"]}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  credential: {
    alignSelf: "center",
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  skeletonContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
});
