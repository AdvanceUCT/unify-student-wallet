import type { Href } from "expo-router";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { StatusPill } from "@/src/components/StatusPill";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function WalletSetupScreen() {
  const { hasPin, session } = useWalletSession();
  const holderAgent = useHolderAgent();
  const primaryHref: Href = hasPin ? "/(auth)/activate" : "/(auth)/set-pin";
  const primaryLabel = hasPin ? "Connect student credential" : "Create secure wallet";
  const agentReady = holderAgent.status === "ready";

  return (
    <AppScreen>
      <View style={{ flex: 1, justifyContent: "space-between", gap: spacing.xl }}>
        <View style={{ gap: spacing.xl }}>
          <View style={{ alignItems: "flex-start", gap: spacing.sm }}>
            <StatusPill label={hasPin ? "Wallet created" : "Setup required"} tone={hasPin ? "success" : "warning"} />
            <Text style={typography.eyebrow}>Wallet setup</Text>
            <Text style={typography.title}>Create your student wallet</Text>
            <Text style={typography.body}>
              First create the encrypted holder wallet on this device. After that, open your university activation link
              to accept the student credential from the issuer agent.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              gap: spacing.md,
              padding: spacing.lg,
            }}
          >
            <InfoRow label="Student" value={session.studentId ?? "Pending"} />
            <InfoRow label="Wallet ID" value={session.walletId ?? "Created after PIN"} tone={hasPin ? "success" : "default"} />
            <InfoRow label="PIN" value={hasPin ? "Set" : "Required"} tone={hasPin ? "success" : "warning"} />
            <InfoRow label="Holder agent" value={holderAgent.status} tone={holderAgent.status === "error" ? "warning" : agentReady ? "success" : "default"} />
            <InfoRow label="Credential" value="Activation link required" />
          </View>

          {holderAgent.error ? (
            <Text accessibilityLiveRegion="polite" style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>
              {holderAgent.error}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppButton href={primaryHref} label={primaryLabel} />
          <Text style={[typography.body, { fontSize: 14 }]}>
            The app will not mark the credential as activated until the holder agent accepts a real issuer invitation.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}
