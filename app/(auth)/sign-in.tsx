import { router } from "expo-router";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Rule } from "@/src/components/Rule";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function SignInScreen() {
  const { isHydrated } = useWalletSession();

  return (
    <AppScreen>
      <View style={{ flex: 1, justifyContent: "space-between" }}>
        <View style={{ gap: spacing.xl }}>
          <View style={{ gap: spacing.sm }}>
            <Text style={typography.eyebrow}>Unify · Student Wallet</Text>
            <Rule />
          </View>

          <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
            <Text style={typography.display}>Welcome.</Text>
            <Text style={typography.bodyLg}>
              Your university credential, in one wallet. Verifiable. Portable. Private.
            </Text>
          </View>

          <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
            <Rule variant="hairline" />
            <View style={{ flexDirection: "row", gap: spacing.lg }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={typography.eyebrow}>Encrypted</Text>
                <Text style={typography.body}>
                  Wallet keys never leave your device. Secured by your PIN.
                </Text>
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={typography.eyebrow}>Portable</Text>
                <Text style={typography.body}>
                  Receive credentials and prove identity wherever you go.
                </Text>
              </View>
            </View>
            <Rule variant="hairline" />
          </View>
        </View>

        <View style={{ gap: spacing.md, paddingTop: spacing["2xl"] }}>
          <AppButton
            disabled={!isHydrated}
            label="Create wallet"
            size="lg"
            onPress={() => router.push("/(auth)/set-pin")}
          />
          <Text style={typography.caption}>
            Setting up creates an encrypted wallet on this device only.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}
