import { router } from "expo-router";
import { Fingerprint, ScanLine, ShieldCheck } from "lucide-react-native";
import { Text, useWindowDimensions, View } from "react-native";

import { AnimatedEntry } from "@/src/components/AnimatedEntry";
import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const principles = [
  { icon: ShieldCheck, title: "Encrypted here", body: "Credentials remain protected on this device." },
  { icon: Fingerprint, title: "You approve sharing", body: "Every verification shows the exact requested values." },
  { icon: ScanLine, title: "Ready to verify", body: "Scan secure QR codes at supported service points." },
];

export default function SignInScreen() {
  const { isHydrated } = useWalletSession();
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(272, Math.min(width - spacing.xl * 2, 520));
  return (
    <AppScreen>
      <View style={{ flex: 1, justifyContent: "space-between", gap: spacing["3xl"] }}>
        <View style={{ gap: spacing["2xl"], width: contentWidth }}>
          <View style={{ gap: spacing.md, paddingTop: spacing.xl, width: contentWidth }}>
            <Text style={typography.eyebrow}>Step 1 of 3 · UNIFY</Text>
            <Text accessibilityRole="header" style={typography.display}>Your student identity.{"\n"}Held by you.</Text>
            <Text style={[typography.bodyLg, { color: colors.inkMuted, maxWidth: 440 }]}>Receive trusted university credentials.{"\n"}You choose what to present.</Text>
          </View>
          <View style={{ borderTopWidth: 1, borderColor: colors.rule }}>
            {principles.map(({ icon: Icon, title, body }, index) => (
              <AnimatedEntry key={title} delay={index * 55}>
                <View style={{ width: contentWidth, flexDirection: "row", gap: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: 1, borderColor: colors.rule }}>
                  <Icon color={colors.primary} size={22} strokeWidth={1.7} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Text style={typography.bodyStrong}>{title}</Text><Text style={typography.body}>{body}</Text></View>
                </View>
              </AnimatedEntry>
            ))}
          </View>
        </View>
        <View style={{ gap: spacing.md, paddingBottom: spacing.lg, width: contentWidth }}>
          <AppButton disabled={!isHydrated} label="Create secure wallet" size="lg" onPress={() => router.push("/(auth)/set-pin")} />
          <AppButton disabled={!isHydrated} label="Restore existing wallet" onPress={() => router.push("/(auth)/restore")} variant="outline" />
          <Text style={[typography.caption, { textAlign: "center" }]}>Setup creates an encrypted wallet on this device.</Text>
        </View>
      </View>
    </AppScreen>
  );
}
