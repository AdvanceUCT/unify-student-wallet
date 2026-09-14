/**
 * @fileoverview Provides the floating/header inbox shortcut used by wallet screens.
 * @module components/InboxHeaderButton
 */

import { router } from "expo-router";
import { Inbox } from "lucide-react-native";
import { Text, View } from "react-native";

import { IconButton } from "@/src/components/IconButton";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { radii } from "@/src/theme/radii";
import { typography } from "@/src/theme/typography";

export function InboxHeaderButton() {
  const colors = useThemePalette();
  const { pendingOfferIds } = useWalletSession();
  const count = pendingOfferIds.length;

  return (
    <View>
      <IconButton
        accessibilityLabel={count > 0 ? `Open inbox, ${count} item${count === 1 ? "" : "s"} need attention` : "Open inbox"}
        icon={Inbox}
        onPress={() => router.push("/(wallet)/inbox")}
      />
      {count > 0 ? (
        <View
          pointerEvents="none"
          style={{
            alignItems: "center",
            backgroundColor: colors.error,
            borderColor: colors.background,
            borderRadius: radii.pill,
            borderWidth: 2,
            height: 22,
            justifyContent: "center",
            minWidth: 22,
            paddingHorizontal: 5,
            position: "absolute",
            right: -4,
            top: -5,
          }}
        >
          <Text style={[typography.caption, { color: colors.white, fontFamily: "IBMPlexSans_600SemiBold", lineHeight: 14 }]}>
            {count > 9 ? "9+" : count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
