import { router } from "expo-router";
import { QrCode as QrCodeIcon } from "lucide-react-native";
import { View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { VerificationHistoryList } from "@/src/features/verification/VerificationHistoryList";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { spacing } from "@/src/theme/spacing";

export default function ActivityScreen() {
  const { verificationHistory } = useWalletSession();

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader eyebrow="Wallet activity" title="Verification history." />

        {verificationHistory.length === 0 ? (
          <EmptyState
            icon={QrCodeIcon}
            eyebrow="No verification history"
            body="Verification events will appear here after you present your credential."
            action={<AppButton label="Scan service QR" onPress={() => router.push("/(wallet)/scan")} />}
          />
        ) : (
          <VerificationHistoryList items={verificationHistory} />
        )}
      </View>
    </AppScreen>
  );
}
