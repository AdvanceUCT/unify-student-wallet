import { type PropsWithChildren } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

type AppScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
}>;

export function AppScreen({ children, scrollable = true, contentContainerStyle }: AppScreenProps) {
  const inner = scrollable ? (
    <ScrollView
      contentContainerStyle={[
        { flexGrow: 1, paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flex: 1 }}>{children}</View>
    </ScrollView>
  ) : (
    <View style={{ flex: 1, paddingHorizontal: spacing.xl, paddingVertical: spacing.xl }}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ backgroundColor: colors.background, flex: 1 }}>{inner}</SafeAreaView>
  );
}
