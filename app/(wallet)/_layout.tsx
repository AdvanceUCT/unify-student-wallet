import { Tabs } from "expo-router";
import { Activity, Home, IdCard, ScanLine, type LucideIcon } from "lucide-react-native";
import { Platform, useWindowDimensions, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { typography } from "@/src/theme/typography";

function tabIcon(Icon: LucideIcon, emphasized = false) {
  return function TabIconRenderer({ color, focused, size }: { color: string; focused: boolean; size: number }) {
    if (emphasized) {
      return (
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radii.pill,
            backgroundColor: focused ? colors.primaryDeep : colors.ink,
            alignItems: "center",
            justifyContent: "center",
            marginTop: -14,
            borderWidth: 4,
            borderColor: colors.background,
          }}
        >
          <Icon color={colors.white} size={24} strokeWidth={1.9} />
        </View>
      );
    }

    return <Icon color={color} size={size} strokeWidth={focused ? 2.1 : 1.6} />;
  };
}

export default function WalletLayout() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  return (
    <Tabs
      screenOptions={{
        animation: "shift",
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkSubtle,
        tabBarLabelStyle: { ...typography.caption, fontFamily: "IBMPlexSans_600SemiBold", fontSize: 11 },
        tabBarPosition: isWide ? "left" : "bottom",
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderColor: colors.rule,
          borderTopWidth: isWide ? 0 : 1,
          borderRightWidth: isWide ? 1 : 0,
          height: isWide ? undefined : 76,
          width: isWide ? 92 : undefined,
          paddingTop: isWide ? 24 : 8,
          paddingBottom: isWide ? 24 : Platform.OS === "ios" ? 18 : 8,
        },
        tabBarItemStyle: { minHeight: 56 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: tabIcon(Home) }} />
      <Tabs.Screen name="credential" options={{ title: "ID", tabBarIcon: tabIcon(IdCard) }} />
      <Tabs.Screen name="scan" options={{ title: "Scan", tabBarIcon: tabIcon(ScanLine, true) }} />
      <Tabs.Screen name="activity" options={{ title: "Activity", tabBarIcon: tabIcon(Activity) }} />
      <Tabs.Screen name="offers" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="backup" options={{ href: null }} />
    </Tabs>
  );
}
