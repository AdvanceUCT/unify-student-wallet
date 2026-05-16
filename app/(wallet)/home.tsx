import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text, View, useWindowDimensions } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { InfoRow } from "@/src/components/InfoRow";
import { Rule } from "@/src/components/Rule";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StudentCard } from "@/src/components/StudentCard";
import { Tag } from "@/src/components/Tag";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { getStudentCredential } from "@/src/lib/api/client";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const MAX_CARD_WIDTH = 360;

function formatToday() {
  const date = new Date();
  return date
    .toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

function truncate(value: string, head = 6, tail = 4) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export default function HomeScreen() {
  const { pendingOfferIds, session } = useWalletSession();
  const holderAgent = useHolderAgent();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.min(screenWidth - spacing.xl * 2, MAX_CARD_WIDTH);

  const credentialQuery = useQuery({
    queryKey: ["student-credential", session.walletId ?? "no-wallet"],
    queryFn: getStudentCredential,
  });

  const credential = credentialQuery.data;
  const hasCredential = Boolean(credential);
  const pendingCount = pendingOfferIds.length;

  return (
    <AppScreen>
      <View style={{ gap: spacing["2xl"] }}>
        <ScreenHeader eyebrow={`Unify · ${formatToday()}`} title="Wallet." />

        {pendingCount > 0 ? (
          <Card
            eyebrow={`${pendingCount} New offer${pendingCount === 1 ? "" : "s"}`}
            heading={
              pendingCount === 1
                ? "A credential offer is waiting."
                : `${pendingCount} credential offers are waiting.`
            }
            trailing={<Tag label="Review" tone="primary" />}
          >
            <View style={{ paddingTop: spacing.sm }}>
              <AppButton label="Review offers" onPress={() => router.push("/(wallet)/offers")} />
            </View>
          </Card>
        ) : null}

        <View style={{ gap: spacing.md }}>
          <Text style={typography.eyebrow}>Credential</Text>
          {credentialQuery.isLoading ? (
            <Text style={typography.body}>Loading credential…</Text>
          ) : hasCredential && credential ? (
            <View style={{ gap: spacing.md }}>
              <StudentCard
                credential={credential}
                width={cardWidth}
                onPress={() => router.push(`/(wallet)/credential/${credential.id}`)}
              />
              <AppButton
                label="View details"
                variant="ghost"
                onPress={() => router.push(`/(wallet)/credential/${credential.id}`)}
              />
            </View>
          ) : (
            <EmptyState
              eyebrow="No credentials yet"
              heading="Receive your first credential."
              body="Open an activation link from your university, or scan an issuer QR code, to receive your student credential."
              action={
                <AppButton label="Open scanner" onPress={() => router.push("/(wallet)/scan")} />
              }
            />
          )}
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={typography.eyebrow}>Activity</Text>
          <EmptyState
            eyebrow="No activity"
            body="Payments and verification events will appear here once your institution connects a service backend."
          />
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={typography.eyebrow}>Wallet status</Text>
          <View
            style={{
              borderColor: colors.rule,
              borderTopWidth: 1,
              borderBottomWidth: 1,
            }}
          >
            <InfoRow
              label="Lock"
              value={session.lockStatus === "unlocked" ? "Unlocked" : "Locked"}
              tone={session.lockStatus === "unlocked" ? "success" : "warning"}
            />
            <InfoRow label="Holder agent" value={holderAgent.status} divider={false} />
          </View>
          <Rule variant="hairline" />
          <Text style={typography.caption}>
            Wallet ID · {session.walletId ? truncate(session.walletId, 8, 6) : "—"}
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}
