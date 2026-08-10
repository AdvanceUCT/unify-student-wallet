import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { BrandGradient } from "@/src/components/BrandGradient";
import {
  credentialMetadata,
  formatCredentialDate,
  type CredentialAttribute,
  type CredentialMetadataSource,
} from "@/src/features/wallet/credentialMetadata";
import { colors } from "@/src/theme/colors";
import { facultyCardTheme } from "@/src/theme/faculty";
import { studentCardAspectRatio } from "@/src/theme/layout";
import { motion } from "@/src/theme/motion";
import { radii } from "@/src/theme/radii";
import { shadows } from "@/src/theme/shadows";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export type CredentialLike = CredentialMetadataSource;
export type { CredentialAttribute };

type StudentCardProps = {
  credential: CredentialLike;
  onPress?: () => void;
  width: number;
  issuerFallback?: string;
};

export { formatCredentialDate };

function CredentialContour() {
  return (
    <Svg
      accessible={false}
      pointerEvents="none"
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheet.absoluteFillObject}
      testID="student-card-contour"
      viewBox="0 0 430 250"
    >
      <Path d="M274 -16C250 28 270 55 322 71C379 88 397 119 371 165C349 204 366 232 439 252" fill="none" opacity={0.16} stroke="#FFFFFF" strokeWidth={1.15} />
      <Path d="M302 -17C278 24 295 48 340 63C399 82 420 117 393 168C375 201 389 227 445 245" fill="none" opacity={0.12} stroke="#FFFFFF" strokeWidth={1} />
      <Path d="M246 -17C221 35 243 69 298 87C344 102 357 126 333 166C307 211 333 239 410 261" fill="none" opacity={0.1} stroke="#FFFFFF" strokeWidth={1} />
      <Path d="M354 -20C333 13 344 37 383 52C433 71 452 101 430 143C409 182 420 215 464 239" fill="none" opacity={0.08} stroke="#FFFFFF" strokeWidth={1} />
    </Svg>
  );
}

export function StudentCard({ credential, onPress, width, issuerFallback }: StudentCardProps) {
  const metadata = credentialMetadata(credential);
  const university = metadata.issuer ?? issuerFallback ?? "University";
  const holderName = metadata.holderName || "Student credential";
  const validTo = formatCredentialDate(metadata.expiresAt);
  const cardTheme = facultyCardTheme(metadata.faculty);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const setPressed = (pressed: boolean) => {
    scale.value = withTiming(pressed ? 0.985 : 1, {
      duration: motion.quick,
      reduceMotion: ReduceMotion.System,
    });
  };

  const handlePress = () => {
    if (!onPress) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View
      style={[
        {
          width,
          aspectRatio: studentCardAspectRatio,
          borderRadius: radii.xl,
          backgroundColor: colors.primaryDeep,
          ...shadows.md,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        accessibilityLabel={`${university} student credential for ${holderName}`}
        accessibilityRole={onPress ? "button" : undefined}
        disabled={!onPress}
        onPress={handlePress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={styles.pressable}
      >
        <BrandGradient colors={cardTheme.gradient} style={styles.gradient} testID="student-card-gradient">
          <CredentialContour />

          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            numberOfLines={1}
            style={styles.university}
          >
            {university.toUpperCase()}
          </Text>

          <View style={styles.identityBlock}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.74}
              numberOfLines={1}
              style={styles.holderName}
            >
              {holderName}
            </Text>

            <View style={styles.metadataRow}>
              <View style={styles.studentNumber}>
                <Text style={styles.label}>STUDENT NUMBER</Text>
                <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.value}>
                  {metadata.studentNumber ?? "—"}
                </Text>
              </View>
              <View style={styles.validity}>
                <Text style={styles.label}>VALID TO</Text>
                <Text numberOfLines={1} style={styles.value}>
                  {validTo === "Not provided" ? "—" : validTo}
                </Text>
              </View>
            </View>
          </View>
        </BrandGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  university: {
    ...typography.eyebrow,
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    lineHeight: 16,
    maxWidth: "72%",
  },
  identityBlock: {
    gap: spacing.md,
  },
  holderName: {
    ...typography.heading,
    color: colors.white,
    fontSize: 21,
    lineHeight: 26,
    maxWidth: "88%",
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.lg,
  },
  studentNumber: {
    flex: 1,
    minWidth: 0,
  },
  validity: {
    flexShrink: 0,
    alignItems: "flex-end",
  },
  label: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 11,
    lineHeight: 15,
  },
  value: {
    ...typography.mono,
    color: colors.white,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 1,
  },
});
