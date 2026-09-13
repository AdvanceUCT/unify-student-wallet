/**
 * @fileoverview Renders the wallet home screen, credential carousel, and pending actions.
 * @module app/(wallet)/home
 */

import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { ArrowRight, CreditCard, QrCode, Wallet as WalletIcon } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { AnimatedEntry } from "@/src/components/AnimatedEntry";
import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { CredentialCarousel } from "@/src/components/CredentialCarousel";
import { EmptyState } from "@/src/components/EmptyState";
import { InboxHeaderButton } from "@/src/components/InboxHeaderButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { CredentialSkeleton } from "@/src/components/Skeleton";
import { UnifiedActivityFeed } from "@/src/components/UnifiedActivityFeed";
import { formatZarMinor } from "@/src/features/payment/money";
import { getWalletActivity, getWalletBalance } from "@/src/features/payment/paymentApi";
import { loadPaymentSession } from "@/src/features/payment/paymentSession";
import { getVerificationActivity, type VerificationActivityRecord } from "@/src/features/verification/activityHistory";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { mergeUnifiedActivity } from "@/src/features/wallet/unifiedActivity";
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
  const [paymentActivated, setPaymentActivated] = useState(false);

  const credentialsQuery = useQuery({
    queryKey: ["stored-credentials", session.walletId ?? "no-wallet"],
    queryFn: getStoredCredentialsLazy,
    enabled: holderAgent.status === "ready",
  });
  const {
    data: balance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: ({ signal }) => getWalletBalance(signal),
    enabled: paymentActivated,
  });
  const {
    data: walletActivity = [],
    refetch: refetchWalletActivity,
  } = useQuery({
    queryKey: ["wallet-activity"],
    queryFn: ({ signal }) => getWalletActivity(signal),
    enabled: paymentActivated,
  });

  useFocusEffect(useCallback(() => {
    let active = true;
    if (session.walletId) {
      void getVerificationActivity(session.walletId).then((records) => {
        if (!active) return;
        setRecentActivity((current) => current.length === records.length && current.every((record, index) => record.id === records[index]?.id) ? current : records);
      });
      void loadPaymentSession({ allowExpired: true }).then((paymentSession) => {
        if (!active) return;
        const activated = Boolean(paymentSession);
        setPaymentActivated(activated);
        if (activated) {
          void refetchBalance();
          void refetchWalletActivity();
        }
      }).catch(() => {
        if (active) setPaymentActivated(false);
      });
    }
    return () => { active = false; };
  }, [refetchBalance, refetchWalletActivity, session.walletId]));

  const credentials = credentialsQuery.data ?? [];
  const hasCredentialData = credentialsQuery.data !== undefined;
  const unifiedActivity = mergeUnifiedActivity({
    verificationActivity: recentActivity,
    walletActivity,
  }).slice(0, 3);
  const balanceText = !paymentActivated
    ? "Not active"
    : balanceLoading
      ? "Loading…"
      : balance
        ? formatZarMinor(balance.postedBalanceMinor)
        : "Unavailable";
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
      <ScreenHeader title="Your identity" trailing={<InboxHeaderButton />} />

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
            <View style={{ gap: spacing.sm }}>
              <AppButton icon={QrCode} label="Scan to verify" onPress={openScanner} size="lg" />
            </View>
          </AnimatedEntry>
        ) : null}

        <AnimatedEntry delay={motion.stagger * 2}>
          <View style={[styles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.rule }]}>
            <View style={styles.balanceHeader}>
              <View style={[styles.balanceIcon, { backgroundColor: colors.primarySoft }]}>
                <WalletIcon color={colors.primary} size={19} strokeWidth={2} />
              </View>
              <View style={styles.balanceCopy}>
                <Text style={typography.eyebrow}>Wallet balance</Text>
                <Text adjustsFontSizeToFit minimumFontScale={0.74} numberOfLines={1} style={typography.display}>{balanceText}</Text>
                <Text style={typography.caption}>
                  {paymentActivated ? "Confirmed top-ups and payments update this balance." : "Activate payments before topping up or paying vendors."}
                </Text>
              </View>
            </View>
            <View style={styles.balanceActions}>
              <AppButton
                icon={CreditCard}
                label={paymentActivated ? "Top up" : "Activate payments"}
                onPress={() => router.push(paymentActivated ? "/(wallet)/topup-amount" : "/(wallet)/payment-activate")}
                variant={paymentActivated ? "primary" : "secondary"}
              />
              <AppButton icon={QrCode} label="Pay or verify" onPress={openScanner} variant="secondary" />
            </View>
          </View>
        </AnimatedEntry>

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
              <Text style={typography.sectionTitle}>Recent activity</Text>
              {unifiedActivity.length ? (
                <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.push("/(wallet)/activity")}>
                  <Text style={[styles.viewAll, { color: colors.primary }]}>View all</Text>
                </Pressable>
              ) : null}
            </View>

            {unifiedActivity.length ? (
              <UnifiedActivityFeed compact items={unifiedActivity} />
            ) : (
              <View style={[styles.noActivityRow, { borderColor: colors.rule }]}>
                <View style={[styles.balanceIcon, { backgroundColor: colors.surfaceAlt }]}>
                  <WalletIcon color={colors.inkSubtle} size={19} strokeWidth={2} />
                </View>
                <View style={styles.activityCopy}>
                  <Text style={typography.bodyStrong}>No activity yet</Text>
                  <Text style={typography.caption}>Payments, top-ups, refunds, and verifications will appear here.</Text>
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
  balanceActions: {
    gap: spacing.sm,
  },
  balanceCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  balanceCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  balanceHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  balanceIcon: {
    alignItems: "center",
    borderRadius: 9,
    height: 38,
    justifyContent: "center",
    width: 38,
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
  activityCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
});
