import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { QrCode as QrCodeIcon, Activity as ActivityIcon } from "lucide-react-native";
import { Text, View, useWindowDimensions } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StudentCard } from "@/src/components/StudentCard";
import { Tag } from "@/src/components/Tag";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { getStudentCredential } from "@/src/lib/api/client";
import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const MAX_CARD_WIDTH = 360;

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
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          eyebrow="Welcome to Unify"
          title="Wallet."
          trailing={
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.pill,
                backgroundColor: colors.primarySoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.primaryDeep, fontSize: 16, fontWeight: "700" }}>U</Text>
            </View>
          }
        />

        {pendingCount > 0 ? (
          <Card
            eyebrow={`${pendingCount} New offer${pendingCount === 1 ? "" : "s"}`}
            heading={
              pendingCount === 1
                ? "A credential offer is waiting."
                : `${pendingCount} credential offers are waiting.`
            }
            trailing={<Tag label="Review" tone="primary" />}
            elevation="md"
          >
            <View style={{ paddingTop: spacing.sm }}>
              <AppButton label="Review offers" onPress={() => router.push("/(wallet)/offers")} />
            </View>
          </Card>
        ) : null}

        <View style={{ gap: spacing.md }}>
          <Text style={typography.heading}>Credential</Text>
          {credentialQuery.isLoading ? (
            <Card>
              <Text style={typography.body}>Loading credential…</Text>
            </Card>
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
              icon={QrCodeIcon}
              eyebrow="No credentials yet"
              heading="Receive your first credential."
              body="Open an activation link from your university, or scan an issuer QR code."
              action={
                <AppButton label="Open scanner" onPress={() => router.push("/(wallet)/scan")} />
              }
            />
          )}
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={typography.heading}>Activity</Text>
          <EmptyState
            icon={ActivityIcon}
            eyebrow="No activity"
            body="Payments and verification events will appear here once your wallet is in use."
          />
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={typography.heading}>Wallet status</Text>
          <Card>
            <InfoRow
              label="Lock"
              value={session.lockStatus === "unlocked" ? "Unlocked" : "Locked"}
              tone={session.lockStatus === "unlocked" ? "success" : "warning"}
              divider
            />
            <InfoRow label="Holder agent" value={holderAgent.status} divider />
            <InfoRow
              label="Wallet ID"
              value={session.walletId ? truncate(session.walletId, 8, 6) : "—"}
            />
          </Card>
        </View>
      </View>
    </AppScreen>
  );
}
