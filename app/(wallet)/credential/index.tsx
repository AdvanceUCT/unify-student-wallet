/**
 * @fileoverview Lists the credentials currently held in the unlocked wallet.
 * @module app/(wallet)/credential/index
 */

import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { IdCard } from "lucide-react-native";
import { Text, View } from "react-native";

import { AnimatedEntry } from "@/src/components/AnimatedEntry";
import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { CredentialSkeleton } from "@/src/components/Skeleton";
import { EmptyState } from "@/src/components/EmptyState";
import { CredentialCarousel } from "@/src/components/CredentialCarousel";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { getStoredCredentialsLazy } from "@/src/features/wallet/holderAgentRuntime";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function CredentialIndexScreen() {
  const colors = useThemePalette();
  const { session } = useWalletSession();
  const holderAgent = useHolderAgent();
  const credentialsQuery = useQuery({
    queryKey: ["stored-credentials", session.walletId ?? "no-wallet"],
    queryFn: getStoredCredentialsLazy,
    enabled: holderAgent.status === "ready",
    refetchInterval: (query) => ((query.state.data ?? []).length === 0 ? 2000 : false),
  });
  const credentials = credentialsQuery.data ?? [];

  return (
    <AppScreen>
      <ScreenHeader eyebrow="Encrypted on this device" title="Credentials" meta={credentials.length ? `${credentials.length} available` : undefined} />
      {holderAgent.status === "idle" || holderAgent.status === "initializing" ? (
        <CredentialSkeleton />
      ) : holderAgent.status === "error" ? (
        <EmptyState icon={IdCard} eyebrow="Wallet still opening" heading="Credentials are temporarily unavailable" body={holderAgent.error ?? "Secure wallet services could not be started."} action={<AppButton label="Try again" onPress={() => session.walletId && void holderAgent.resumeWallet(session.walletId)} />} />
      ) : credentialsQuery.isLoading ? (
        <CredentialSkeleton />
      ) : credentialsQuery.isError ? (
        <EmptyState icon={IdCard} eyebrow="Could not load credentials" heading="Your wallet is still protected" body="Check the wallet agent and try again." action={<AppButton label="Try again" onPress={() => void credentialsQuery.refetch()} />} />
      ) : credentials.length === 0 ? (
        <EmptyState icon={IdCard} eyebrow="No credentials" heading="Your wallet is empty" body="Open an activation link from your institution to receive your first credential." action={<AppButton label="Open scanner" onPress={() => router.push("/(wallet)/scan")} />} />
      ) : (
        <View style={{ gap: spacing.xl, alignItems: "center" }}>
          <AnimatedEntry>
            <CredentialCarousel
              accessibilityLabel="Stored credentials"
              credentials={credentials}
              onCredentialPress={(credential) => router.push(`/(wallet)/credential/${credential.id}`)}
            />
          </AnimatedEntry>
          <Text style={[typography.caption, { color: colors.inkSubtle, textAlign: "center" }]}>Credentials remain encrypted inside this wallet.</Text>
        </View>
      )}
    </AppScreen>
  );
}
