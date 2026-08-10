/**
 * @fileoverview Shows the student's privacy-preserving verification activity history.
 * @module app/(wallet)/activity
 */

import { useFocusEffect } from "expo-router";
import { Activity as ActivityIcon } from "lucide-react-native";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { ActivityLedger } from "@/src/components/ActivityLedger";
import { AppScreen } from "@/src/components/AppScreen";
import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { getVerificationActivity, type VerificationActivityRecord } from "@/src/features/verification/activityHistory";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";

export default function ActivityScreen() {
  const { session } = useWalletSession();
  const [records, setRecords] = useState<VerificationActivityRecord[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (session.walletId) void getVerificationActivity(session.walletId).then((items) => active && setRecords(items));
    return () => { active = false; };
  }, [session.walletId]));

  return (
    <AppScreen>
      <ScreenHeader eyebrow="Audit trail" title="Activity" meta={records.length ? `${records.length} recent presentations` : undefined} />
      {records.length === 0 ? (
        <EmptyState icon={ActivityIcon} eyebrow="No presentations yet" heading="Your activity is private." body="Credential presentations will appear here after you approve or decline a verification request." />
      ) : (
        <View><ActivityLedger records={records} /></View>
      )}
    </AppScreen>
  );
}
