import { type PropsWithChildren } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

type AppScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  contentWidth?: "standard" | "full";
}>;

const STANDARD_CONTENT_WIDTH = 720;

export function AppScreen({ children, scrollable = true, contentContainerStyle, contentWidth = "standard" }: AppScreenProps) {
  const contentStyle = {
    flex: 1,
    minWidth: 0,
    width: "100%" as const,
    maxWidth: contentWidth === "standard" ? STANDARD_CONTENT_WIDTH : undefined,
    alignSelf: "center" as const,
  };

  const inner = scrollable ? (
    <ScrollView
      contentContainerStyle={[
        { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing["2xl"] },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={contentStyle}>{children}</View>
    </ScrollView>
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
    </View>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ backgroundColor: colors.background, flex: 1 }}>{inner}</SafeAreaView>
  );
}
