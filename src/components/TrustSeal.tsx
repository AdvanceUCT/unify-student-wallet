import * as Haptics from "expo-haptics";
import { AlertTriangle, Check, LockKeyhole, ShieldCheck, X } from "lucide-react-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/src/theme/colors";
import { motion } from "@/src/theme/motion";
import { radii } from "@/src/theme/radii";

export type TrustSealState = "loading" | "secure" | "success" | "warning" | "error";

type TrustSealProps = {
  animate?: boolean;
  haptic?: boolean;
  lockToCheck?: boolean;
  onAnimationComplete?: () => void;
  size?: number;
  state: TrustSealState;
};

export function TrustSeal({
  animate = true,
  haptic = false,
  lockToCheck = false,
  onAnimationComplete,
  size = 144,
  state,
}: TrustSealProps) {
  const reducedMotion = useReducedMotion();
  const entrance = useSharedValue(!animate || reducedMotion ? 1 : 0);
  const resolution = useSharedValue(!animate || reducedMotion ? 1 : 0);
  const spin = useSharedValue(0);
  const toneColor = state === "success" ? colors.success : state === "warning" ? colors.warning : state === "error" ? colors.error : colors.primary;
  const toneSoft = state === "success" ? colors.successSoft : state === "warning" ? colors.warningSoft : state === "error" ? colors.errorSoft : colors.primarySoft;
  const centreSize = Math.round(size * 0.61);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (!animate || reducedMotion) {
      entrance.value = 1;
      resolution.value = 1;
      if (haptic) {
        const feedback = state === "success"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning;
        void Haptics.notificationAsync(feedback);
      }
      onAnimationComplete?.();
      return undefined;
    }

    if (state === "loading" && animate && !reducedMotion) {
      entrance.value = 1;
      spin.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.System }),
        -1,
        false,
      );
      return undefined;
    }

    entrance.value = withTiming(1, { duration: motion.quick, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
    resolution.value = lockToCheck
      ? withDelay(220, withTiming(1, { duration: motion.standard, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }))
      : withTiming(1, { duration: motion.standard, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });

    if (haptic) {
      const feedback = state === "success"
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning;
      timers.push(setTimeout(() => void Haptics.notificationAsync(feedback), 300));
    }
    if (onAnimationComplete) {
      timers.push(setTimeout(onAnimationComplete, motion.result));
    }
    return () => timers.forEach(clearTimeout);
  }, [animate, entrance, haptic, lockToCheck, onAnimationComplete, reducedMotion, resolution, spin, state]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { rotate: state === "loading" ? `${spin.value * 360}deg` : "0deg" },
      { scale: 0.82 + entrance.value * 0.18 },
    ],
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
    <View accessibilityLabel={`${state} status`} accessibilityRole="image" style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: size - 8,
            height: size - 8,
            borderRadius: radii.pill,
            borderWidth: 2,
            borderColor: toneSoft,
            borderTopColor: toneColor,
            borderRightColor: state === "loading" ? "transparent" : toneColor,
          },
          ringStyle,
        ]}
      />
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
