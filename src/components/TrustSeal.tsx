/**
 * @fileoverview Shows issuer and cryptographic trust details for a credential.
 * @module components/TrustSeal
 */

import * as Haptics from "expo-haptics";
import { AlertTriangle, Check, LockKeyhole, ShieldCheck, X } from "lucide-react-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { colors } from "@/src/theme/colors";
import { motion } from "@/src/theme/motion";
import { radii } from "@/src/theme/radii";

export type TrustSealState = "loading" | "secure" | "success" | "warning" | "error";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type TrustSealProps = {
  animate?: boolean;
  busy?: boolean;
  haptic?: boolean;
  lockToCheck?: boolean;
  onAnimationComplete?: () => void;
  size?: number;
  state: TrustSealState;
};

export function TrustSeal({
  animate = true,
  busy,
  haptic = false,
  lockToCheck = false,
  onAnimationComplete,
  size = 144,
  state,
}: TrustSealProps) {
  const reducedMotion = useReducedMotion();
  const entrance = useSharedValue(!animate || reducedMotion ? 1 : 0);
  const resolution = useSharedValue(!animate || reducedMotion ? 1 : 0);
  const ringProgress = useSharedValue(!animate || reducedMotion ? 1 : 0);
  const spin = useSharedValue(0);
  const pulse = useSharedValue(1);
  const isBusy = busy ?? state === "loading";
  const toneColor = state === "success" ? colors.success : state === "warning" ? colors.warning : state === "error" ? colors.error : colors.primary;
  const toneSoft = state === "success" ? colors.successSoft : state === "warning" ? colors.warningSoft : state === "error" ? colors.errorSoft : colors.primarySoft;
  const centreSize = Math.round(size * 0.61);
  const ringSize = size - 8;
  const ringStroke = 3;
  const ringRadius = (ringSize - ringStroke * 2) / 2;
  const circumference = 2 * Math.PI * ringRadius;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    cancelAnimation(entrance);
    cancelAnimation(resolution);
    cancelAnimation(ringProgress);
    cancelAnimation(spin);
    cancelAnimation(pulse);
    spin.value = 0;
    pulse.value = 1;

    if (!animate) {
      entrance.value = 1;
      resolution.value = 1;
      ringProgress.value = 1;
      if (haptic && !isBusy) {
        const feedback = state === "success"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning;
        void Haptics.notificationAsync(feedback);
      }
      if (!isBusy) onAnimationComplete?.();
      return () => {
        cancelAnimation(entrance);
        cancelAnimation(resolution);
        cancelAnimation(ringProgress);
        cancelAnimation(spin);
        cancelAnimation(pulse);
      };
    }

    if (isBusy) {
      entrance.value = 1;
      resolution.value = 1;
      ringProgress.value = 0;
      if (reducedMotion) {
        pulse.value = withRepeat(
          withTiming(0.56, { duration: 1000, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.Never }),
          -1,
          true,
        );
      } else {
        spin.value = withRepeat(
          withTiming(1, { duration: 1100, easing: Easing.linear, reduceMotion: ReduceMotion.System }),
          -1,
          false,
        );
      }
      return () => {
        cancelAnimation(entrance);
        cancelAnimation(resolution);
        cancelAnimation(ringProgress);
        cancelAnimation(spin);
        cancelAnimation(pulse);
      };
    }

    if (reducedMotion) {
      entrance.value = 1;
      resolution.value = 1;
      ringProgress.value = 1;
      if (haptic) {
        const feedback = state === "success"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning;
        void Haptics.notificationAsync(feedback);
      }
      onAnimationComplete?.();
      return () => {
        cancelAnimation(entrance);
        cancelAnimation(resolution);
        cancelAnimation(ringProgress);
        cancelAnimation(spin);
        cancelAnimation(pulse);
      };
    }

    entrance.value = 0;
    resolution.value = 0;
    ringProgress.value = 0;
    entrance.value = withTiming(1, { duration: motion.quick, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
    resolution.value = lockToCheck
      ? withDelay(220, withTiming(1, { duration: motion.standard, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }))
      : withTiming(1, { duration: motion.standard, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
    ringProgress.value = withTiming(1, { duration: motion.deliberate, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });

    if (haptic) {
      const feedback = state === "success"
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning;
      timers.push(setTimeout(() => void Haptics.notificationAsync(feedback), 300));
    }
    if (onAnimationComplete) {
      timers.push(setTimeout(onAnimationComplete, motion.result));
    }
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimation(entrance);
      cancelAnimation(resolution);
      cancelAnimation(ringProgress);
      cancelAnimation(spin);
      cancelAnimation(pulse);
    };
  }, [animate, entrance, haptic, isBusy, lockToCheck, onAnimationComplete, pulse, reducedMotion, resolution, ringProgress, spin, state]);

  const busyRingStyle = useAnimatedStyle(() => ({
    opacity: entrance.value * pulse.value,
    transform: [
      { rotate: `${spin.value * 360}deg` },
      { scale: 0.82 + entrance.value * 0.18 },
    ],
  }));
  const resultRingStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ scale: 0.92 + entrance.value * 0.08 }],
  }));
  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - ringProgress.value),
  }));
  const lockStyle = useAnimatedStyle(() => ({
    opacity: lockToCheck ? 1 - resolution.value : 1,
    transform: [{ scale: lockToCheck ? 1 - resolution.value * 0.18 : 1 }, { rotate: `${resolution.value * -12}deg` }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: resolution.value,
    transform: [{ scale: 0.72 + resolution.value * 0.28 }, { rotate: `${(1 - resolution.value) * 18}deg` }],
  }));

  const StaticIcon = state === "success" ? Check : state === "warning" ? AlertTriangle : state === "error" ? X : state === "secure" ? LockKeyhole : ShieldCheck;

  return (
    <View
      accessibilityLabel={isBusy ? `${state} operation in progress` : `${state} status`}
      accessibilityRole={isBusy ? "progressbar" : "image"}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <View style={{ position: "absolute", width: ringSize, height: ringSize }}>
        <Svg height={ringSize} width={ringSize}>
          <Circle cx={ringSize / 2} cy={ringSize / 2} fill="none" r={ringRadius} stroke={toneSoft} strokeWidth={ringStroke} />
        </Svg>
      </View>
      {isBusy ? (
        <Animated.View style={[{ position: "absolute", width: ringSize, height: ringSize }, busyRingStyle]}>
          <Svg height={ringSize} width={ringSize}>
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              fill="none"
              r={ringRadius}
              stroke={toneColor}
              strokeDasharray={`${circumference * 0.26} ${circumference * 0.74}`}
              strokeLinecap="round"
              strokeWidth={ringStroke}
            />
          </Svg>
        </Animated.View>
      ) : (
        <Animated.View style={[{ position: "absolute", width: ringSize, height: ringSize }, resultRingStyle]}>
          <Svg height={ringSize} width={ringSize}>
            <AnimatedCircle
              animatedProps={ringAnimatedProps}
              cx={ringSize / 2}
              cy={ringSize / 2}
              fill="none"
              r={ringRadius}
              stroke={toneColor}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeLinecap="round"
              strokeWidth={ringStroke}
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            />
          </Svg>
        </Animated.View>
      )}
      <View style={{ width: centreSize, height: centreSize, borderRadius: radii.pill, backgroundColor: toneSoft, alignItems: "center", justifyContent: "center" }}>
        {lockToCheck ? (
          <>
            <Animated.View style={[{ position: "absolute" }, lockStyle]}><LockKeyhole color={toneColor} size={Math.round(size * 0.27)} strokeWidth={1.7} /></Animated.View>
            <Animated.View style={[{ position: "absolute" }, checkStyle]}><Check color={toneColor} size={Math.round(size * 0.29)} strokeWidth={2.2} /></Animated.View>
          </>
        ) : <StaticIcon color={toneColor} size={Math.round(size * 0.27)} strokeWidth={1.7} />}
      </View>
    </View>
  );
}
