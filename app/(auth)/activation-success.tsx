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

function titleForStatus(activationStatus: string, hasPin: boolean) {
  if (activationStatus === "activationPending") {
    return "Activation link accepted";
  }

  if (activationStatus === "activated" && hasPin) {
    return "Credential stored";
  }

  return "Wallet setup";
}

export default function ActivationSuccessScreen() {
  const { activationSetup, hasPin, session } = useWalletSession();
  const holderAgent = useHolderAgent();
  const isActivationPending = session.activationStatus === "activationPending";
  const isActivated = session.activationStatus === "activated";
  const primaryHref: Href = isActivationPending
    ? "/(auth)/set-pin"
    : isActivated && session.lockStatus === "locked"
      ? "/(auth)/unlock"
      : isActivated
        ? "/(wallet)/home"
        : "/(auth)/activate";
  const primaryLabel = isActivationPending
    ? "Create wallet PIN"
    : isActivated && session.lockStatus === "locked"
      ? "Unlock wallet"
      : isActivated
        ? "Open wallet"
        : "Open activation";
  const statusLabel = isActivationPending ? "Setup required" : isActivated ? "Complete" : "Waiting";
  const statusTone = isActivationPending ? "warning" : "success";

  return (
    <AppScreen>
      <View style={{ flex: 1, justifyContent: "space-between", gap: spacing.xl }}>
        <View style={{ gap: spacing.xl }}>
          <View style={{ alignItems: "flex-start", gap: spacing.sm }}>
            <StatusPill label={statusLabel} tone={statusTone} />
            <Text style={typography.eyebrow}>Activation</Text>
            <Text style={typography.title}>{titleForStatus(session.activationStatus, hasPin)}</Text>
            <Text style={typography.body}>
              {isActivationPending
                ? "Your university link was accepted. Create a PIN next so the wallet can accept and store the credential safely."
                : isActivated
                  ? "Your student credential is connected to this wallet. Continue to unlock and use campus services."
                  : "Open a university activation link to start wallet creation."}
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
            <InfoRow label="Issuer" value={activationSetup?.issuerLabel ?? "Not resolved"} />
            <InfoRow label="Ledger" value={activationSetup?.ledgerName ?? "Not resolved"} />
            <InfoRow label="Wallet ID" value={activationSetup?.walletId ?? session.walletId ?? "Pending"} />
            <InfoRow label="Student ID" value={activationSetup?.studentId ?? session.studentId ?? "Pending"} />
            <InfoRow label="Activation source" value={activationSetup?.activationSource ?? session.activationSource ?? "Pending"} />
            <InfoRow label="Holder agent" value={holderAgent.status} tone={holderAgent.status === "error" ? "warning" : "default"} />
            <InfoRow label="Issuer exchange" value={activationSetup?.credentialExchangeId ?? session.credentialExchangeId ?? "Pending"} />
            <InfoRow label="Credential record" value={activationSetup?.credentialRecordId ?? session.credentialRecordId ?? "Created after PIN"} />
            <InfoRow label="Connection record" value={activationSetup?.holderConnectionId ?? session.holderConnectionId ?? "Created after PIN"} />
          </View>

          {holderAgent.error ? (
            <Text accessibilityLiveRegion="polite" style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>
              {holderAgent.error}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppButton href={primaryHref} label={primaryLabel} />
          {isActivationPending ? (
            <Text style={[typography.body, { fontSize: 14 }]}>The credential is accepted only after your PIN is confirmed.</Text>
          ) : null}
        </View>
      </View>
    </AppScreen>
  );
}
