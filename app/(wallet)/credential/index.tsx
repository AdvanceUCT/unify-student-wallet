import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { StudentCard } from "@/src/components/StudentCard";
import { getStoredCredentials } from "@/src/features/wallet/holderAgent";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const MAX_CARD_WIDTH = 360;

export default function CredentialIndexScreen() {
  const { session } = useWalletSession();
  const { width: screenWidth } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);

  const credentialsQuery = useQuery({
    queryKey: ["stored-credentials", session.walletId ?? "no-wallet"],
    queryFn: getStoredCredentials,
    refetchInterval: (query) => ((query.state.data ?? []).length === 0 ? 2000 : false),
  });

  const credentials = credentialsQuery.data ?? [];
  const cardWidth = Math.min(screenWidth - spacing.lg * 2, MAX_CARD_WIDTH);
  const gap = spacing.md;
  const sidePadding = Math.max((screenWidth - cardWidth) / 2, spacing.lg);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (cardWidth + gap));
    if (index !== currentIndex) {
      setCurrentIndex(Math.max(0, Math.min(index, credentials.length - 1)));
    }
  };

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Credential</Text>
          <Text style={typography.title}>Your wallet</Text>
          <Text style={typography.body}>Swipe to browse the credentials stored in your wallet. Tap a card for full details.</Text>
        </View>

        {credentialsQuery.isLoading ? <Text style={typography.body}>Loading credentials…</Text> : null}

        {credentialsQuery.isError ? (
          <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>
            Credential details could not be loaded.
          </Text>
        ) : null}

        {!credentialsQuery.isLoading && credentials.length === 0 ? (
          <View
            style={{
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              gap: spacing.sm,
              padding: spacing.lg,
            }}
          >
            <Text style={typography.sectionTitle}>No credentials stored yet</Text>
            <Text style={typography.body}>
              Open an activation link from your university to receive your student credential.
            </Text>
          </View>
        ) : null}

        {credentials.length > 0 ? (
          <View style={{ marginHorizontal: -spacing.lg, gap: spacing.md }}>
            <FlatList
              data={credentials}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={cardWidth + gap}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: sidePadding, gap }}
              onMomentumScrollEnd={handleScrollEnd}
              renderItem={({ item }) => (
                <StudentCard
                  credential={item}
                  width={cardWidth}
                  onPress={() => router.push(`/(wallet)/credential/${item.id}`)}
                />
              )}
            />
            {credentials.length > 1 ? (
              <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.xs }}>
                {credentials.map((c, i) => (
                  <View
                    key={c.id}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: i === currentIndex ? colors.primary : colors.border,
                    }}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}
