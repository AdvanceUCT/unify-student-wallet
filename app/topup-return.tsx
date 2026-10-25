/**
 * @fileoverview Handles Paystack browser return deep links and forwards them into the wallet result flow.
 * @module app/topup-return
 */

import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { TrustSeal } from "@/src/components/TrustSeal";
import { parseTopUpReturnLink } from "@/src/lib/validation/qrPayload";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default function TopUpReturnRoute() {
  const params = useLocalSearchParams<{ topUpId?: string | string[] }>();
  const topUpId = firstParam(params.topUpId);

  useEffect(() => {
    const parsed = parseTopUpReturnLink(`unifywallet://topup-return?topUpId=${encodeURIComponent(topUpId)}`);
    if (parsed.ok) {
      router.replace({
        pathname: "/(wallet)/topup-result",
        params: { topUpId: parsed.topUpId, returned: "1" },
      });
      return;
    }

    router.replace("/(wallet)/payments");
  }, [topUpId]);

  return (
    <AppScreen scrollable={false}>
      <View style={{ alignItems: "center", flex: 1, gap: spacing.lg, justifyContent: "center" }}>
        <TrustSeal busy state="loading" />
        <Text style={[typography.heading, { textAlign: "center" }]}>Returning to wallet</Text>
        <Text style={[typography.body, { textAlign: "center" }]}>
          UNIFY is opening the top-up confirmation screen.
        </Text>
      </View>
    </AppScreen>
  );
}
