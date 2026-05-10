import { router } from "expo-router";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function SignInScreen() {
  const { isHydrated } = useWalletSession();

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
            <Text style={typography.title}>Welcome to UNIFY</Text>
            <Text style={typography.body}>
              Set up your student wallet to receive credentials from your university.
            </Text>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppButton
            disabled={!isHydrated}
            label="Create wallet"
            onPress={() => router.push("/(auth)/set-pin")}
          />
          <Text style={[typography.body, { fontSize: 14 }]}>Start with encrypted wallet setup on this device.</Text>
        </View>
      </View>
    </AppScreen>
  );
}
