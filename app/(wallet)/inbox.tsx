/**
 * @fileoverview Lists actionable offer, expiry, and credential-state alerts.
 * @module app/(wallet)/inbox
 */

import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { AlertTriangle, ArrowRight, Inbox as InboxIcon, Mail, ShieldAlert } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { AnimatedEntry } from "@/src/components/AnimatedEntry";
import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Skeleton } from "@/src/components/Skeleton";
import { StatusPill } from "@/src/components/StatusPill";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { buildCredentialInboxAlerts, type CredentialInboxAlert } from "@/src/features/wallet/inbox";
import { getStoredCredentialsLazy } from "@/src/features/wallet/holderAgentRuntime";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

function InboxRow({ alert }: { alert: CredentialInboxAlert }) {
  const colors = useThemePalette();
  const expired = alert.type === "expired";
  const Icon = expired ? ShieldAlert : AlertTriangle;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/(wallet)/credential/${alert.credentialId}`)}
      style={({ pressed }) => ({
        borderTopWidth: 1,
        borderColor: colors.rule,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.lg,
        opacity: pressed ? 0.68 : 1,
      })}
    >
      <View style={{ width: 42, height: 42, borderRadius: radii.pill, backgroundColor: expired ? colors.errorSoft : colors.warningSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon color={expired ? colors.error : colors.warning} size={20} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Text style={[typography.bodyStrong, { flex: 1 }]}>{alert.title}</Text>
          <StatusPill label={expired ? "Expired" : "Soon"} tone={expired ? "error" : "warning"} />
        </View>
        <Text style={typography.body}>{alert.message}</Text>
      </View>
      <ArrowRight color={colors.inkSubtle} size={18} />
    </Pressable>
  );
}

export default function InboxScreen() {
  const colors = useThemePalette();
  const { pendingOfferIds, session } = useWalletSession();
  const holderAgent = useHolderAgent();
  const credentialsQuery = useQuery({
    queryKey: ["stored-credentials", session.walletId ?? "no-wallet"],
    queryFn: getStoredCredentialsLazy,
    enabled: holderAgent.status === "ready",
  });
  const alerts = buildCredentialInboxAlerts(credentialsQuery.data ?? []);
  const attentionCount = alerts.length + pendingOfferIds.length;

  return (
    <AppScreen>
      <ScreenHeader
        eyebrow="Wallet updates"
        title="Inbox"
        meta={attentionCount > 0 ? `${attentionCount} item${attentionCount === 1 ? " needs" : "s need"} attention` : "No action needed"}
      />

      {pendingOfferIds.length > 0 ? (
        <AnimatedEntry>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(wallet)/offers")}
            style={({ pressed }) => ({
              backgroundColor: colors.focusSoft,
              borderLeftWidth: 4,
              borderLeftColor: colors.focus,
              padding: spacing.lg,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
              opacity: pressed ? 0.72 : 1,
              marginBottom: spacing.xl,
            })}
          >
            <View style={{ width: 42, height: 42, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
              <Mail color={colors.focus} size={20} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.eyebrow, { color: colors.focus }]}>Waiting for review</Text>
              <Text style={typography.bodyStrong}>{pendingOfferIds.length} credential offer{pendingOfferIds.length === 1 ? "" : "s"}</Text>
              <Text style={typography.caption}>Review the signed attributes before adding them to your wallet.</Text>
            </View>
            <ArrowRight color={colors.focus} size={20} />
          </Pressable>
        </AnimatedEntry>
      ) : null}

      {holderAgent.status === "idle" || holderAgent.status === "initializing" || credentialsQuery.isLoading ? (
        <View accessibilityLabel="Loading wallet updates" accessibilityRole="progressbar" style={{ gap: spacing.md }}>
          <Skeleton height={18} width="42%" />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </View>
      ) : holderAgent.status === "error" || credentialsQuery.isError ? (
        <Card surface="alt">
          <Text style={typography.bodyStrong}>Credential alerts could not be loaded.</Text>
          <Text style={[typography.body, { marginTop: spacing.xs, marginBottom: spacing.md }]}>{holderAgent.error ?? "The encrypted wallet could not be read."}</Text>
          <AppButton
            label="Try again"
            onPress={() => {
              if (holderAgent.status === "error" && session.walletId) {
                void holderAgent.resumeWallet(session.walletId);
                return;
              }
              void credentialsQuery.refetch();
            }}
          />
        </Card>
      ) : alerts.length > 0 ? (
        <AnimatedEntry delay={55}>
          <View>
            <Text style={[typography.sectionTitle, { marginBottom: spacing.sm }]}>Credential alerts</Text>
            {alerts.map((alert) => <InboxRow key={alert.id} alert={alert} />)}
            <View style={{ borderTopWidth: 1, borderColor: colors.rule }} />
          </View>
        </AnimatedEntry>
      ) : pendingOfferIds.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          eyebrow="All caught up"
          heading="Nothing needs your attention"
          body="Credential offers and important validity updates will appear here."
        />
      ) : null}
    </AppScreen>
  );
}
