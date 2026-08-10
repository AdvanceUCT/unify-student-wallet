/**
 * @fileoverview Renders the wallet home screen, credential carousel, and pending actions.
 * @module app/(wallet)/home
 */

import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { Activity as ActivityIcon, ArrowRight, QrCode, Settings } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { AnimatedEntry } from "@/src/components/AnimatedEntry";
import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { CredentialCarousel } from "@/src/components/CredentialCarousel";
import { EmptyState } from "@/src/components/EmptyState";
import { IconButton } from "@/src/components/IconButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { CredentialSkeleton } from "@/src/components/Skeleton";
import { StatusPill } from "@/src/components/StatusPill";
import { getVerificationActivity, type VerificationActivityRecord } from "@/src/features/verification/activityHistory";
import { verificationOutcomeLabel } from "@/src/features/verification/verificationOutcome";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { getStoredCredentialsLazy } from "@/src/features/wallet/holderAgentRuntime";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import {
  standardContentMaxWidth,
  studentCardAspectRatio,
  studentCardMaxWidth,
} from "@/src/theme/layout";
import { motion } from "@/src/theme/motion";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function HomeScreen() {
  const colors = useThemePalette();
  const { width: windowWidth } = useWindowDimensions();
  const { pendingOfferIds, session } = useWalletSession();
  const holderAgent = useHolderAgent();
  const [recentActivity, setRecentActivity] = useState<VerificationActivityRecord[]>([]);

  const credentialsQuery = useQuery({
    queryKey: ["stored-credentials", session.walletId ?? "no-wallet"],
    queryFn: getStoredCredentialsLazy,
    enabled: holderAgent.status === "ready",
  });

  useFocusEffect(useCallback(() => {
    let active = true;
    if (session.walletId) void getVerificationActivity(session.walletId).then((records) => {
      if (!active) return;
      const next = records.slice(0, 3);
      setRecentActivity((current) => current.length === next.length && current.every((record, index) => record.id === next[index]?.id) ? current : next);
    });
    return () => { active = false; };
  }, [session.walletId]));

  const credentials = credentialsQuery.data ?? [];
  const hasCredentialData = credentialsQuery.data !== undefined;
  const credentialStageWidth = Math.min(
    Math.max(0, windowWidth - spacing.xl * 2),
    standardContentMaxWidth,
    studentCardMaxWidth,
  );
  const credentialStageHeight = credentialStageWidth / studentCardAspectRatio;

  const openScanner = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(wallet)/scan");
  };

  return (
    <AppScreen>
      <ScreenHeader
        title="Your identity"
        trailing={<IconButton accessibilityLabel="Open settings" icon={Settings} onPress={() => router.push("/(wallet)/settings")} />}
      />

      <View style={styles.content}>
        <View
          style={[styles.credentialArea, { minHeight: credentialStageHeight }]}
          testID="home-credential-stage"
        >
          {!hasCredentialData && (holderAgent.status === "idle" || holderAgent.status === "initializing") ? (
            <CredentialSkeleton />
          ) : holderAgent.status === "error" && !hasCredentialData ? (
            <EmptyState
              action={<AppButton label="Try again" onPress={() => session.walletId && void holderAgent.resumeWallet(session.walletId)} />}
              body={holderAgent.error ?? "Secure wallet services could not be started."}
              eyebrow="Wallet still opening"
              heading="Credentials are temporarily unavailable"
              icon={QrCode}
            />
          ) : credentialsQuery.isLoading && !hasCredentialData ? (
            <CredentialSkeleton />
          ) : credentialsQuery.isError && credentials.length === 0 ? (
            <EmptyState
              action={<AppButton label="Try again" onPress={() => void credentialsQuery.refetch()} />}
              body="Try reading the encrypted wallet again."
              eyebrow="Could not load credentials"
              heading="Your wallet is still protected"
              icon={QrCode}
            />
          ) : credentials.length ? (
            <AnimatedEntry delay={motion.stagger}>
              <CredentialCarousel
                accessibilityLabel="Student credentials"
                credentials={credentials}
                onCredentialPress={(credential) => router.push(`/(wallet)/credential/${credential.id}`)}
              />
            </AnimatedEntry>
          ) : (
            <EmptyState
              action={<AppButton icon={QrCode} label="Scan to receive" onPress={openScanner} />}
              body="Open an activation link from your institution or scan its QR code."
              eyebrow="Wallet empty"
              heading="Receive your student identity"
              icon={QrCode}
            />
          )}
        </View>

        {credentials.length > 0 && holderAgent.status === "ready" && !credentialsQuery.isLoading ? (
          <AnimatedEntry delay={motion.stagger * 2}>
            <AppButton icon={QrCode} label="Scan to verify" onPress={openScanner} size="lg" />
          </AnimatedEntry>
        ) : null}

        {pendingOfferIds.length > 0 ? (
          <AnimatedEntry delay={motion.stagger * 3}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(wallet)/offers")}
              style={({ pressed }) => [styles.offer, { backgroundColor: colors.primarySoft, opacity: pressed ? 0.72 : 1 }]}
            >
              <View style={[styles.offerCount, { backgroundColor: colors.primary }]}>
                <Text style={styles.offerCountText}>{pendingOfferIds.length}</Text>
              </View>
              <Text numberOfLines={1} style={[typography.bodyStrong, styles.offerText]}>
                Credential offer{pendingOfferIds.length === 1 ? "" : "s"} ready
              </Text>
              <ArrowRight color={colors.primary} size={19} strokeWidth={2} />
            </Pressable>
          </AnimatedEntry>
        ) : null}

        <AnimatedEntry delay={motion.stagger * 4}>
          <View style={styles.activitySection}>
            <View style={styles.sectionHeader}>
              <Text style={typography.sectionTitle}>Recent presentations</Text>
              {recentActivity.length ? (
                <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.push("/(wallet)/activity")}>
                  <Text style={[styles.viewAll, { color: colors.primary }]}>View all</Text>
                </Pressable>
              ) : null}
            </View>

            {recentActivity.length ? (
              <View style={{ borderTopWidth: 1, borderColor: colors.rule }}>
                {recentActivity.map((record) => {
                  const showOutcome = record.status !== "Approved" || Boolean(record.failureCode);
                  return (
                    <Pressable
                      key={record.id}
                      accessibilityLabel={`${record.verifierName}, ${record.status}`}
                      accessibilityRole="button"
                      onPress={() => router.push("/(wallet)/activity")}
                      style={({ pressed }) => [styles.activityRow, { borderColor: colors.rule, opacity: pressed ? 0.7 : 1 }]}
                    >
                      <View style={[styles.activityIcon, { backgroundColor: colors.surfaceAlt }]}>
                        <ActivityIcon color={colors.primary} size={19} strokeWidth={2} />
                      </View>
                      <View style={styles.activityCopy}>
                        <Text numberOfLines={1} style={typography.bodyStrong}>{record.verifierName}</Text>
                        <Text numberOfLines={1} style={typography.caption}>{record.servicePointName} · {new Date(record.occurredAt).toLocaleString()}</Text>
                        {showOutcome ? <Text numberOfLines={1} style={[typography.caption, { color: record.status === "Expired" ? colors.warning : colors.error }]}>{verificationOutcomeLabel(record)}</Text> : null}
                      </View>
                      <StatusPill label={record.status} tone={record.status === "Approved" ? "success" : record.status === "Expired" ? "warning" : "error"} />
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.noActivityRow, { borderColor: colors.rule }]}>
                <View style={[styles.activityIcon, { backgroundColor: colors.surfaceAlt }]}>
                  <ActivityIcon color={colors.inkSubtle} size={19} strokeWidth={2} />
                </View>
                <View style={styles.activityCopy}>
                  <Text style={typography.bodyStrong}>No presentations yet</Text>
                  <Text style={typography.caption}>Completed verifications will appear here.</Text>
                </View>
              </View>
            )}
          </View>
        </AnimatedEntry>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  credentialArea: {
    width: "100%",
  },
  offer: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  offerCount: {
    alignItems: "center",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  offerCountText: {
    ...typography.label,
    color: "#FFFFFF",
  },
  offerText: {
    flex: 1,
  },
  activitySection: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  viewAll: {
    ...typography.label,
  },
  activityRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 68,
    paddingVertical: spacing.md,
  },
  noActivityRow: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.md,
  },
  activityIcon: {
    alignItems: "center",
    borderRadius: 9,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  activityCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
});
