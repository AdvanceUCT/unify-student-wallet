/**
 * @fileoverview Displays the full, searchable campus wallet transaction history.
 * @module app/(wallet)/transactions
 */

import { useState } from "react";
import { FlatList, RefreshControl, Text, TextInput, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { TransactionRow } from "@/src/components/TransactionRow";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { useWallet } from "@/src/features/payment/useWallet";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function TransactionsScreen() {
  const colors = useThemePalette();
  const { transactions, isLoading, refresh } = useWallet();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTransactions = transactions.filter((tx) =>
    tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.type.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <AppScreen contentContainerStyle={{ paddingBottom: 0 }} scrollable={false}>
      <View style={{ flex: 1, gap: spacing.lg }}>
        <ScreenHeader eyebrow="Wallet" title="Transactions" />

        <TextInput
          accessibilityLabel="Search transactions"
          onChangeText={setSearchQuery}
          placeholder="Search transactions..."
          placeholderTextColor={colors.inkSubtle}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.md,
            borderWidth: 1.5,
            borderColor: colors.rule,
            color: colors.ink,
            fontFamily: "IBMPlexSans_400Regular",
            fontSize: 16,
            minHeight: 52,
            paddingHorizontal: spacing.lg,
          }}
          value={searchQuery}
        />

        <FlatList
          contentContainerStyle={{ paddingBottom: spacing.xl, flexGrow: 1 }}
          data={filteredTransactions}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.ruleSoft }} />}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: spacing["2xl"] }}>
              <Text style={typography.body}>
                {searchQuery ? "No transactions match your search" : "No transactions yet"}
              </Text>
            </View>
          }
          refreshControl={<RefreshControl onRefresh={() => void refresh()} refreshing={isLoading} />}
          renderItem={({ item }) => <TransactionRow transaction={item} />}
        />
      </View>
    </AppScreen>
  );
}
