import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { Activity as ActivityIcon, ArrowRight, QrCode, Settings } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AnimatedEntry } from "@/src/components/AnimatedEntry";
import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { CredentialSkeleton } from "@/src/components/Skeleton";
import { EmptyState } from "@/src/components/EmptyState";
import { IconButton } from "@/src/components/IconButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StatusPill } from "@/src/components/StatusPill";
import { CredentialCarousel } from "@/src/components/CredentialCarousel";
import { getVerificationActivity, type VerificationActivityRecord } from "@/src/features/verification/activityHistory";
import { getStoredCredentialsLazy } from "@/src/features/wallet/holderAgentRuntime";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function HomeScreen() {
  const { pendingOfferIds, session } = useWalletSession();
  const holderAgent = useHolderAgent();
  const [recentActivity, setRecentActivity] = useState<VerificationActivityRecord>();

  const credentialsQuery = useQuery({
    queryKey: ["stored-credentials", session.walletId ?? "no-wallet"],
    queryFn: getStoredCredentialsLazy,
    enabled: holderAgent.status === "ready",
  });

  useFocusEffect(useCallback(() => {
    let active = true;
    if (session.walletId) void getVerificationActivity(session.walletId).then((records) => active && setRecentActivity(records[0]));
    return () => { active = false; };
  }, [session.walletId]));

  const credentials = credentialsQuery.data ?? [];

  return (
    <AppScreen>
      <ScreenHeader
        title="Your identity"
        trailing={<IconButton accessibilityLabel="Open settings" icon={Settings} onPress={() => router.push("/(wallet)/settings")} />}
      />

      <View style={{ gap: spacing["2xl"] }}>
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
                opacity: pressed ? 0.78 : 1,
              })}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typography.eyebrow, { color: colors.focus }]}>{pendingOfferIds.length} new credential offer{pendingOfferIds.length === 1 ? "" : "s"}</Text>
                <Text style={typography.bodyStrong}>Review what your institution issued</Text>
              </View>
              <ArrowRight color={colors.focus} size={20} />
            </Pressable>
          </AnimatedEntry>
        ) : null}

        <View style={{ gap: spacing.md }}>
          <Text style={typography.sectionTitle}>Student ID</Text>
          {holderAgent.status === "idle" || holderAgent.status === "initializing" ? (
            <CredentialSkeleton />
          ) : holderAgent.status === "error" ? (
            <EmptyState
              icon={QrCode}
              eyebrow="Wallet still opening"
              heading="Credentials are temporarily unavailable"
              body={holderAgent.error ?? "Secure wallet services could not be started."}
              action={<AppButton label="Try again" onPress={() => session.walletId && void holderAgent.resumeWallet(session.walletId)} />}
            />
          ) : credentialsQuery.isLoading ? (
            <CredentialSkeleton />
          ) : credentialsQuery.isError ? (
            <EmptyState
              icon={QrCode}
              eyebrow="Could not load credentials"
              heading="Your wallet is still protected"
              body="Try reading the encrypted wallet again."
              action={<AppButton label="Try again" onPress={() => void credentialsQuery.refetch()} />}
            />
          ) : credentials.length ? (
            <AnimatedEntry delay={55}>
              <CredentialCarousel
                accessibilityLabel="Student credentials"
                credentials={credentials}
                onCredentialPress={(credential) => router.push(`/(wallet)/credential/${credential.id}`)}
              />
            </AnimatedEntry>
          ) : (
            <EmptyState
              icon={QrCode}
              eyebrow="Wallet empty"
              heading="Receive your student identity"
              body="Open an activation link from your institution or scan its QR code."
              action={<AppButton label="Open scanner" onPress={() => router.push("/(wallet)/scan")} />}
            />
          )}
        </View>

        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[typography.sectionTitle, { flex: 1 }]}>Latest presentation</Text>
            {recentActivity ? <AppButton label="View all" variant="ghost" onPress={() => router.push("/(wallet)/activity")} /> : null}
          </View>
          {recentActivity ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(wallet)/activity")}
              style={({ pressed }) => ({ paddingVertical: spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule, opacity: pressed ? 0.72 : 1 })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <ActivityIcon color={colors.primary} size={22} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={typography.bodyStrong}>{recentActivity.verifierName}</Text>
                  <Text style={typography.caption}>{recentActivity.servicePointName} · {new Date(recentActivity.occurredAt).toLocaleString()}</Text>
                </View>
                <StatusPill label={recentActivity.status} tone={recentActivity.status === "Approved" ? "success" : recentActivity.status === "Expired" ? "warning" : "error"} />
              </View>
            </Pressable>
          ) : (
            <EmptyState icon={ActivityIcon} eyebrow="No presentations" body="Your approved credential presentations will appear here." />
          )}
        </View>
      </View>
    </AppScreen>
  );
}
