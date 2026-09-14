/**
 * @fileoverview Shows the student's unified wallet activity history.
 * @module app/(wallet)/activity
 */

import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { Activity as ActivityIcon } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { EmptyState } from "@/src/components/EmptyState";
import { InboxHeaderButton } from "@/src/components/InboxHeaderButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { UnifiedActivityFeed } from "@/src/components/UnifiedActivityFeed";
import { getWalletActivity } from "@/src/features/payment/paymentApi";
import { loadPaymentSession } from "@/src/features/payment/paymentSession";
import { getVerificationActivity, type VerificationActivityRecord } from "@/src/features/verification/activityHistory";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { filterUnifiedActivity, mergeUnifiedActivity, type UnifiedActivityFilter } from "@/src/features/wallet/unifiedActivity";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function ActivityScreen() {
  const colors = useThemePalette();
  const { session } = useWalletSession();
  const [records, setRecords] = useState<VerificationActivityRecord[]>([]);
  const [paymentActivated, setPaymentActivated] = useState(false);
  const [filter, setFilter] = useState<UnifiedActivityFilter>("all");
  const {
    data: walletActivity = [],
    isError: walletActivityError,
    refetch: refetchWalletActivity,
  } = useQuery({
    queryKey: ["wallet-activity"],
    queryFn: ({ signal }) => getWalletActivity(signal),
    enabled: paymentActivated,
  });

  useFocusEffect(useCallback(() => {
    let active = true;
    if (session.walletId) {
      void getVerificationActivity(session.walletId).then((items) => active && setRecords(items));
      void loadPaymentSession({ allowExpired: true }).then((paymentSession) => {
        if (!active) return;
        const activated = Boolean(paymentSession);
        setPaymentActivated(activated);
        if (activated) void refetchWalletActivity();
      }).catch(() => {
        if (active) setPaymentActivated(false);
      });
    }
    return () => { active = false; };
  }, [refetchWalletActivity, session.walletId]));

  const allItems = mergeUnifiedActivity({
    verificationActivity: records,
    walletActivity,
  });
  const filteredItems = filterUnifiedActivity(allItems, filter);

  return (
    <AppScreen>
      <ScreenHeader
        eyebrow="Audit trail"
        title="Activity"
        meta={allItems.length ? `${allItems.length} recent wallet event${allItems.length === 1 ? "" : "s"}` : undefined}
        trailing={<InboxHeaderButton />}
      />
      {walletActivityError ? (
        <View style={{ backgroundColor: colors.warningSoft, borderRadius: 14, marginBottom: spacing.lg, padding: spacing.lg }}>
          <Text accessibilityLiveRegion="polite" style={[typography.bodyStrong, { color: colors.warning }]}>
            Payment activity could not refresh. Verification activity is still shown.
          </Text>
        </View>
      ) : null}
      {allItems.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          eyebrow="No activity yet"
          heading="Your wallet activity is private."
          body="Payments, top-ups, refunds, and credential presentations will appear here after you use them."
        />
      ) : (
        <UnifiedActivityFeed filter={filter} items={filteredItems} onFilterChange={setFilter} showFilters />
      )}
    </AppScreen>
  );
}
