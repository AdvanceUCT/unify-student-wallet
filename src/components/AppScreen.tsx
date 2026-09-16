/**
 * @fileoverview Provides the standard safe-area, scrolling, width, and footer screen layout.
 * @module components/AppScreen
 */

import { type PropsWithChildren, type ReactNode } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { standardContentMaxWidth } from "@/src/theme/layout";
import { spacing } from "@/src/theme/spacing";

type AppScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  contentWidth?: "standard" | "full";
  footer?: ReactNode;
}>;

export function AppScreen({ children, scrollable = true, contentContainerStyle, contentWidth = "standard", footer }: AppScreenProps) {
  const colors = useThemePalette();
  const insets = useSafeAreaInsets();
  const contentStyle = {
    minWidth: 0,
    width: "100%" as const,
    maxWidth: contentWidth === "standard" ? standardContentMaxWidth : undefined,
    alignSelf: "center" as const,
  };

  const footerContent = footer ? (
    <View testID="app-screen-footer" style={[contentStyle, { flexShrink: 0, paddingTop: spacing.xl }]}>
      {footer}
    </View>
  ) : null;

  const inner = scrollable ? (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[
          { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing["2xl"] },
          contentContainerStyle,
          footer ? { paddingBottom: Math.max(insets.bottom + spacing.lg, spacing["2xl"]) } : null,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={[contentStyle, footer ? { flexShrink: 0 } : { flex: 1 }]}>{children}</View>
        {footerContent}
      </ScrollView>
    </View>
  ) : (
    <View
      style={[
        {
          flex: 1,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xl,
          paddingBottom: spacing["2xl"],
        },
        contentContainerStyle,
        footer ? { paddingBottom: Math.max(insets.bottom + spacing.lg, spacing["2xl"]) } : null,
      ]}
    >
      <View style={[contentStyle, { flex: 1 }]}>{children}</View>
      {footerContent}
    </View>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ backgroundColor: colors.background, flex: 1 }}>{inner}</SafeAreaView>
  );
}
