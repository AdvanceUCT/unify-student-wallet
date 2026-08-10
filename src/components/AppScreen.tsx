/**
 * @fileoverview Provides the standard safe-area, scrolling, width, and footer screen layout.
 * @module components/AppScreen
 */

import { type PropsWithChildren, type ReactNode } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const contentStyle = {
    flex: 1,
    minWidth: 0,
    width: "100%" as const,
    maxWidth: contentWidth === "standard" ? standardContentMaxWidth : undefined,
    alignSelf: "center" as const,
  };

  const footerContent = footer ? (
    <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg }}>
      <View style={contentStyle}>{footer}</View>
    </View>
  ) : null;

  const inner = scrollable ? (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[
          { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: footer ? spacing.lg : spacing["2xl"] },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={contentStyle}>{children}</View>
      </ScrollView>
      {footerContent}
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
      ]}
    >
      <View style={contentStyle}>{children}</View>
      {footerContent}
    </View>
  );

  return (
    <SafeAreaView edges={footer ? ["top", "left", "right", "bottom"] : ["top", "left", "right"]} style={{ backgroundColor: colors.background, flex: 1 }}>{inner}</SafeAreaView>
  );
}
