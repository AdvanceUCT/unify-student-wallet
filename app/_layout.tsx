import { Fraunces_600SemiBold, Fraunces_700Bold, useFonts as useFraunces } from "@expo-google-fonts/fraunces";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  useFonts as useIBMPlexMono,
} from "@expo-google-fonts/ibm-plex-mono";
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  useFonts as useIBMPlexSans,
} from "@expo-google-fonts/ibm-plex-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";

import { AutoLockProvider } from "@/src/features/wallet/AutoLockProvider";
import { HolderAgentProvider } from "@/src/features/wallet/HolderAgentProvider";
import { WalletRouteGate, WalletSessionProvider } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  const [fraunces] = useFraunces({ Fraunces_600SemiBold, Fraunces_700Bold });
  const [plexSans] = useIBMPlexSans({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
  });
  const [plexMono] = useIBMPlexMono({ IBMPlexMono_400Regular, IBMPlexMono_500Medium });

  if (!fraunces || !plexSans || !plexMono) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <HolderAgentProvider>
        <WalletSessionProvider>
          <AutoLockProvider>
            <WalletRouteGate>
              <StatusBar style="dark" backgroundColor={colors.background} />
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
  );
}
