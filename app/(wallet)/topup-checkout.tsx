/**
 * @fileoverview Hosts the Paystack checkout inside an in-app WebView and detects the outcome.
 * @module app/(wallet)/topup-checkout
 */

import { router, useLocalSearchParams } from "expo-router";
import { Lock, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";

import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { spacing } from "@/src/theme/spacing";

export default function TopUpCheckoutScreen() {
  const colors = useThemePalette();
  const { checkoutUrl, amountCents } = useLocalSearchParams<{
    checkoutUrl: string;
    transactionId: string;
    amountCents: string;
  }>();
  const [isLoading, setIsLoading] = useState(true);

  const decodedUrl = decodeURIComponent(checkoutUrl ?? "");

  function confirmCancel() {
    Alert.alert("Cancel top-up?", "Your payment will not be processed.", [
      { text: "Stay", style: "cancel" },
      { text: "Leave", onPress: () => router.back() },
    ]);
  }

  function handleNavigationStateChange(navState: WebViewNavigation) {
    const url = navState.url ?? "";

    if (url.includes("topup/success") || url.includes("payment/success")) {
      router.replace({ pathname: "/(wallet)/topup-result", params: { status: "success", amountCents } });
      return;
    }

    if (url.includes("topup/cancel") || url.includes("topup/failed")) {
      router.replace({ pathname: "/(wallet)/topup-result", params: { status: "failed", amountCents } });
    }
  }

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ flex: 1, backgroundColor: colors.camera }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <TouchableOpacity accessibilityLabel="Cancel top-up" accessibilityRole="button" onPress={confirmCancel}>
          <X color={colors.white} size={24} />
        </TouchableOpacity>
        <Text style={{ color: colors.white, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 15 }}>Add funds · Paystack</Text>
        <Lock color={colors.white} size={20} />
      </View>

      <View style={{ flex: 1 }}>
        <WebView
          domStorageEnabled
          javaScriptEnabled
          onLoadEnd={() => setIsLoading(false)}
          onLoadStart={() => setIsLoading(true)}
          onNavigationStateChange={handleNavigationStateChange}
          source={{ uri: decodedUrl }}
          style={{ flex: 1 }}
        />
        {isLoading ? (
          <View
            style={{
              position: "absolute",
              inset: 0,
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.md,
              backgroundColor: "rgba(5, 8, 6, 0.72)",
            }}
          >
            <ActivityIndicator color={colors.white} size="large" />
            <Text style={{ color: colors.white }}>Loading secure payment...</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
