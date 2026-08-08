import { type PropsWithChildren } from "react";
import { Platform, View } from "react-native";
import Animated, { FadeIn, ReduceMotion, SlideInDown } from "react-native-reanimated";

import { motion } from "@/src/theme/motion";

export function AnimatedEntry({ children, delay = 0 }: PropsWithChildren<{ delay?: number }>) {
  // Reanimated web entering layouts can temporarily remove siblings from flow.
  if (Platform.OS === "web") return <View>{children}</View>;

  return (
    <Animated.View
      entering={SlideInDown.duration(motion.standard)
        .delay(delay)
        .reduceMotion(ReduceMotion.System)
        .withInitialValues({ transform: [{ translateY: 12 }], opacity: 0 })}
    >
      {children}
    </Animated.View>
  );
}

export function AnimatedFade({ children }: PropsWithChildren) {
  if (Platform.OS === "web") return <View>{children}</View>;
  return <Animated.View entering={FadeIn.duration(motion.quick).reduceMotion(ReduceMotion.System)}>{children}</Animated.View>;
}
