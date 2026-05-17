import { Tabs } from "expo-router";
import {
  Home as HomeIcon,
  IdCard as IdCardIcon,
  Mail as MailIcon,
  QrCode as QrCodeIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react-native";
import { Platform, View } from "react-native";

import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";

function tabIcon(Icon: LucideIcon) {
  return function TabIconRenderer({ color, focused, size }: { color: string; focused: boolean; size: number }) {
    return (
      <View style={{ alignItems: "center", justifyContent: "center", gap: 4 }}>
        <Icon color={color} size={size} strokeWidth={focused ? 2 : 1.5} />
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: radii.pill,
            backgroundColor: focused ? colors.primary : "transparent",
          }}
        />
      </View>
    );
  };
}

export default function WalletLayout() {
  const { pendingOfferIds } = useWalletSession();
  const offersBadge = pendingOfferIds.length > 0 ? String(pendingOfferIds.length) : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkSubtle,
        tabBarShowLabel: false,
        tabBarItemStyle: { paddingTop: 8 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          borderTopLeftRadius: radii.lg,
          borderTopRightRadius: radii.lg,
          height: 78,
          ...Platform.select({
            ios: {
              shadowColor: "#0F1411",
              shadowOpacity: 0.08,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: -4 },
            },
            android: { elevation: 8 },
            default: {},
          }),
        },
        tabBarBadgeStyle: {
          backgroundColor: colors.primary,
          color: colors.surface,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: tabIcon(HomeIcon) }} />
      <Tabs.Screen name="credential" options={{ title: "ID", tabBarIcon: tabIcon(IdCardIcon) }} />
      <Tabs.Screen name="scan" options={{ title: "Scan", tabBarIcon: tabIcon(QrCodeIcon) }} />
      <Tabs.Screen
        name="offers"
        options={{ title: "Offers", tabBarIcon: tabIcon(MailIcon), tabBarBadge: offersBadge }}
      />
      <Tabs.Screen name="payments" options={{ title: "Pay", tabBarIcon: tabIcon(ReceiptIcon) }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: tabIcon(SettingsIcon) }} />
    </Tabs>
  );
}
