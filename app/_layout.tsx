import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";

import { WalletRouteGate, WalletSessionProvider } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <WalletSessionProvider>
        <WalletRouteGate>
          <StatusBar style="dark" backgroundColor={colors.background} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </WalletRouteGate>
      </WalletSessionProvider>
    </QueryClientProvider>
  );
}
