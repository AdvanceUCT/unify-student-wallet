import { router } from "expo-router";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function SignInScreen() {
  return (
    <AppScreen>
      <View style={{ flex: 1, justifyContent: "space-between", gap: spacing.xl }}>
        <View style={{ gap: spacing.lg }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: colors.primary,
              borderRadius: 8,
              height: 56,
              justifyContent: "center",
              width: 56,
            }}
          >
            <Text style={{ color: colors.white, fontSize: 24, fontWeight: "800" }}>U</Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={typography.brand}>UNIFY</Text>
            <Text style={typography.title}>Student wallet</Text>
            <Text style={typography.body}>
              Keep your student credential ready for campus services, vendor checks, and payments.
            </Text>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppButton label="Continue with demo wallet" onPress={() => router.replace("/(wallet)/home")} />
          <AppButton label="Activate credential" variant="secondary" onPress={() => router.push("/(auth)/activate")} />
        </View>
      </View>
    </AppScreen>
  );
}
