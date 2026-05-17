import { router } from "expo-router";
import { Lock as LockIcon, Globe as GlobeIcon } from "lucide-react-native";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function SignInScreen() {
  const { isHydrated } = useWalletSession();

  return (
    <AppScreen>
      <View style={{ flex: 1, justifyContent: "space-between" }}>
        <View style={{ gap: spacing.xl }}>
          <View style={{ gap: spacing.md }}>
            <Text style={typography.caption}>Unify · Student Wallet</Text>
            <Text style={typography.display}>Welcome.</Text>
            <Text style={typography.bodyLg}>
              Your university credential, in one wallet. Verifiable. Portable. Private.
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Card>
                <View style={{ gap: spacing.sm }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radii.pill,
                      backgroundColor: colors.primarySoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LockIcon color={colors.primary} size={18} strokeWidth={1.6} />
                  </View>
                  <Text style={typography.bodyStrong}>Encrypted</Text>
                  <Text style={typography.body}>Keys never leave your device.</Text>
                </View>
              </Card>
            </View>
            <View style={{ flex: 1 }}>
              <Card>
                <View style={{ gap: spacing.sm }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radii.pill,
                      backgroundColor: colors.primarySoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <GlobeIcon color={colors.primary} size={18} strokeWidth={1.6} />
                  </View>
                  <Text style={typography.bodyStrong}>Portable</Text>
                  <Text style={typography.body}>Prove identity anywhere.</Text>
                </View>
              </Card>
            </View>
          </View>
        </View>

        <View style={{ gap: spacing.md, paddingTop: spacing["2xl"] }}>
          <AppButton
            disabled={!isHydrated}
            label="Create wallet"
            size="lg"
            onPress={() => router.push("/(auth)/set-pin")}
          />
          <Text style={[typography.caption, { textAlign: "center" }]}>
            Setting up creates an encrypted wallet on this device only.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}
