import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { useFonts as useSansFonts, IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, IBMPlexSans_700Bold } from "@expo-google-fonts/ibm-plex-sans";
import { useFonts as useMonoFonts, IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";

import { ThemePreferenceProvider, useThemePalette, useThemePreference } from "@/src/features/theme/ThemePreferenceProvider";
import { AutoLockProvider } from "@/src/features/wallet/AutoLockProvider";
import { HolderAgentProvider } from "@/src/features/wallet/HolderAgentProvider";
import { WalletRouteGate, WalletSessionProvider } from "@/src/features/wallet/WalletSessionProvider";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return <ThemePreferenceProvider><RootNavigator /></ThemePreferenceProvider>;
}

function RootNavigator() {
  const [queryClient] = useState(() => new QueryClient());
  const { hydrated, resolvedScheme } = useThemePreference();
  const colors = useThemePalette();
  const [sansLoaded, sansError] = useSansFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
  });
  const [monoLoaded, monoError] = useMonoFonts({ IBMPlexMono_500Medium });

  const fontsReady = process.env.NODE_ENV === "test" || ((sansLoaded || Boolean(sansError)) && (monoLoaded || Boolean(monoError)));
  const appReady = fontsReady && hydrated;
  const navigationTheme = useMemo(() => ({
    ...(resolvedScheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(resolvedScheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      border: colors.rule,
      card: colors.surface,
      notification: colors.focus,
      primary: colors.primary,
      text: colors.ink,
    },
  }), [colors, resolvedScheme]);

  useEffect(() => {
    if (appReady) void SplashScreen.hideAsync().catch(() => undefined);
  }, [appReady]);

  if (!appReady) return null;

  // Provider order matters: routing needs the agent and session ready above it.
  return (
    <NavigationThemeProvider value={navigationTheme}>
      <QueryClientProvider client={queryClient}>
        <HolderAgentProvider>
          <WalletSessionProvider>
            <AutoLockProvider>
              <WalletRouteGate>
                <StatusBar style={resolvedScheme === "dark" ? "light" : "dark"} backgroundColor={colors.background} />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                  }}
                />
              </WalletRouteGate>
            </AutoLockProvider>
          </WalletSessionProvider>
        </HolderAgentProvider>
      </QueryClientProvider>
    </NavigationThemeProvider>
  );
}
