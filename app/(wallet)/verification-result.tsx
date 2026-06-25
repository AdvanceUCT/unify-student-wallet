import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle } from "lucide-react-native";
import { View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

type VerificationResultParams = {
  studentName: string;
  faculty: string;
  validUntil: string;
  vendorId: string;
  servicePointId: string;
  verifiedAt: string;
};

export default function VerificationResultScreen() {
  const { studentName, faculty, validUntil, vendorId, servicePointId, verifiedAt } =
    useLocalSearchParams<VerificationResultParams>();

  const verifiedTime = verifiedAt ? new Date(verifiedAt).toLocaleTimeString() : "";

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ alignItems: "center", gap: spacing.md }}>
          <CheckCircle color={colors.primary} size={56} strokeWidth={1.6} />
          <ScreenHeader eyebrow="Verified" title="Identity confirmed." meta={verifiedTime} />
        </View>

        <Card heading="Verified credential">
          <InfoRow label="Name" value={studentName} divider />
          <InfoRow label="Faculty" value={faculty} divider />
          <InfoRow label="Valid until" value={validUntil} divider />
          <InfoRow label="Vendor" value={vendorId} />
        </Card>

        <AppButton label="Done" onPress={() => router.replace("/(wallet)/home")} size="lg" />
      </View>
    </AppScreen>
  );
}
