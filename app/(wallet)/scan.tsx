import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { Camera, Flashlight, FlashlightOff, ScanLine, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager, Pressable, Text, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { parseActivationLink } from "@/src/features/wallet/activationLinks";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { parseCheckoutVerificationLink, parseVerificationLink } from "@/src/lib/validation/qrPayload";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function ScanScreen() {
  const colors = useThemePalette();
  const { processIncomingLink } = useWalletSession();
  const { preloadRuntime } = useHolderAgent();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string | null>(null);
  const [captureState, setCaptureState] = useState<"idle" | "captured" | "processing">("idle");
  const [torch, setTorch] = useState(false);
  const scanLockedRef = useRef(false);
  const scanProgress = useSharedValue(0);
  const capturePulse = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!reducedMotion) scanProgress.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }), -1, true);
  }, [reducedMotion, scanProgress]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void preloadRuntime().catch(() => undefined);
    });
    return () => task.cancel();
  }, [preloadRuntime]);

  useFocusEffect(useCallback(() => {
    scanLockedRef.current = false;
    setCaptureState("idle");
    setScanError(null);
  }, []));

  const scanLineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scanProgress.value * 214 }] }));
  const captureFrameStyle = useAnimatedStyle(() => ({
    opacity: 1 - capturePulse.value * 0.12,
    transform: [{ scale: 1 - capturePulse.value * 0.035 }],
  }));

  function resetScanner() {
    scanLockedRef.current = false;
    setCaptureState("idle");
    setScanError(null);
  }

  async function handleRawPayload(rawPayload: string) {
    if (scanLockedRef.current) return;
    scanLockedRef.current = true;
    setCaptureState("captured");
    if (!reducedMotion) {
      capturePulse.value = withSequence(
        withTiming(1, { duration: 90, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 110, easing: Easing.inOut(Easing.cubic) }),
      );
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise<void>((resolve) => setTimeout(resolve, reducedMotion ? 0 : 200));
    setCaptureState("processing");

    if (parseActivationLink(rawPayload).ok) {
      const result = await processIncomingLink(rawPayload);
      if (!result.ok) {
        setScanError(result.error);
        return;
      }
      router.push("/(wallet)/offers");
      return;
    }

    const checkout = parseCheckoutVerificationLink(rawPayload);
    if (checkout.ok) {
      router.push({ pathname: "/verify/checkout/[verificationRequestId]", params: { verificationRequestId: checkout.verificationRequestId, token: checkout.claimToken } });
      return;
    }

    const verification = parseVerificationLink(rawPayload);
    if (verification.ok) {
      router.push(`/verify/${encodeURIComponent(verification.publicServicePointId)}`);
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setScanError("This is not a supported UNIFY activation or verification QR code.");
  }

  return (
    <AppScreen contentWidth="full" scrollable={false} contentContainerStyle={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, backgroundColor: colors.camera }}>
      <View style={{ flex: 1, backgroundColor: colors.camera }}>
        {permission?.granted ? (
          <CameraView enableTorch={torch} onBarcodeScanned={captureState === "idle" ? ({ data }) => void handleRawPayload(data) : undefined} style={{ flex: 1 }} />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.lg }}>
            <View style={{ width: 72, height: 72, borderRadius: radii.pill, borderWidth: 1, borderColor: "#496058", alignItems: "center", justifyContent: "center" }}><Camera color={colors.cameraInk} size={30} /></View>
            <Text style={[typography.title, { color: colors.cameraInk, textAlign: "center" }]}>Camera access needed</Text>
            <Text style={[typography.body, { color: "#C5D0CB", textAlign: "center", maxWidth: 320 }]}>UNIFY uses the camera only to read activation and verification QR codes.</Text>
            <AppButton label="Allow camera" onPress={() => void requestPermission()} />
          </View>
        )}

        <View pointerEvents="box-none" style={{ position: "absolute", inset: 0, padding: spacing.xl, justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ gap: 2 }}><Text style={[typography.eyebrow, { color: "#9BCBB7" }]}>UNIFY scanner</Text><Text style={[typography.heading, { color: colors.cameraInk }]}>Scan a secure QR</Text></View>
            <Pressable accessibilityLabel={torch ? "Turn flashlight off" : "Turn flashlight on"} accessibilityRole="button" onPress={() => setTorch((value) => !value)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: radii.pill, backgroundColor: "rgba(5, 8, 6, 0.58)", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
              {torch ? <FlashlightOff color={colors.cameraInk} size={21} /> : <Flashlight color={colors.cameraInk} size={21} />}
            </Pressable>
          </View>

          {permission?.granted ? (
            <Animated.View pointerEvents="none" style={[{ alignSelf: "center", width: 260, height: 260 }, captureFrameStyle]}>
              {[{ top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }].map((position, index) => <View key={index} style={{ position: "absolute", width: 46, height: 46, borderColor: colors.white, ...position }} />)}
              {captureState === "idle" && !reducedMotion ? <Animated.View style={[{ height: 2, left: 12, right: 12, backgroundColor: "#76D4AC", position: "absolute", top: 22 }, scanLineStyle]} /> : <ScanLine color="#76D4AC" size={32} style={{ alignSelf: "center", marginTop: 114 }} />}
            </Animated.View>
          ) : <View />}

          <View style={{ gap: spacing.md }}>
            {scanError ? (
              <View style={{ backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}><X color={colors.warning} size={22} /><Text accessibilityLiveRegion="assertive" style={[typography.bodyStrong, { flex: 1 }]}>{scanError}</Text></View>
                <AppButton label="Scan another code" onPress={resetScanner} />
              </View>
            ) : (
              <Text accessibilityLiveRegion="polite" style={[typography.body, { color: colors.cameraInk, textAlign: "center" }]}>
                {captureState === "idle" ? "Place the complete QR code inside the frame." : captureState === "captured" ? "Code captured" : "Opening secure request..."}
              </Text>
            )}
          </View>
        </View>
      </View>
    </AppScreen>
  );
}
