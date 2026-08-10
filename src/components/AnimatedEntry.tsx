/**
 * @fileoverview Provides reduced-motion-aware entry and fade transitions.
 * @module components/AnimatedEntry
 */

import { type PropsWithChildren, useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { motion } from "@/src/theme/motion";

function NativeAnimatedEntry({ children, delay }: PropsWithChildren<{ delay: number }>) {
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = process.env.NODE_ENV === "test" || systemReducedMotion;
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    progress.value = reducedMotion
      ? 1
      : withDelay(
          delay,
          withTiming(1, { duration: motion.standard, reduceMotion: ReduceMotion.System }),
        );

    return () => cancelAnimation(progress);
  }, [delay, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 12 }],
  }));

  return <Animated.View style={[styles.wrapper, animatedStyle]}>{children}</Animated.View>;
}

function NativeAnimatedFade({ children }: PropsWithChildren) {
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = process.env.NODE_ENV === "test" || systemReducedMotion;
  const opacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    opacity.value = reducedMotion
      ? 1
      : withTiming(1, { duration: motion.quick, reduceMotion: ReduceMotion.System });

    return () => cancelAnimation(opacity);
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.wrapper, animatedStyle]}>{children}</Animated.View>;
}

export function AnimatedEntry({ children, delay = 0 }: PropsWithChildren<{ delay?: number }>) {
  if (Platform.OS === "web") return <View style={styles.wrapper}>{children}</View>;
  return <NativeAnimatedEntry delay={delay}>{children}</NativeAnimatedEntry>;
}

export function AnimatedFade({ children }: PropsWithChildren) {
  if (Platform.OS === "web") return <View style={styles.wrapper}>{children}</View>;
  return <NativeAnimatedFade>{children}</NativeAnimatedFade>;
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "stretch",
    width: "100%",
  },
});
