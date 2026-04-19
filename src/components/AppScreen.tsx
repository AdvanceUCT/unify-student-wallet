import { type PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

export function AppScreen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.lg }}>
        <View style={{ flex: 1 }}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
