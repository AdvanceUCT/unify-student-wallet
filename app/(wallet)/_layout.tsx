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

import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { rules } from "@/src/theme/rules";

function tabIcon(Icon: LucideIcon) {
  return function TabIconRenderer({ color, size }: { color: string; size: number }) {
    return <Icon color={color} size={size} strokeWidth={1.5} />;
  };
}

export default function WalletLayout() {
  const { pendingOfferIds } = useWalletSession();
  const offersBadge = pendingOfferIds.length > 0 ? String(pendingOfferIds.length) : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDeep,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: "IBMPlexMono_500Medium",
          fontSize: 10,
          letterSpacing: 1,
          textTransform: "uppercase",
        },
        tabBarItemStyle: { paddingTop: 6, paddingBottom: 6 },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.rule,
          borderTopWidth: rules.ink,
          elevation: 0,
          shadowOpacity: 0,
          height: 72,
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
