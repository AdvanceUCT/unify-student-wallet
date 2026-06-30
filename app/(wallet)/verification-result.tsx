import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle } from "lucide-react-native";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type VerificationResultParams = {
  studentName: string;
  faculty: string;
  validUntil: string;
  vendorId: string;
  servicePointId: string;
  verifiedAt: string;
};

function formatVerifiedAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VerificationResultScreen() {
  const { studentName, faculty, validUntil, vendorId, servicePointId, verifiedAt } =
    useLocalSearchParams<VerificationResultParams>();

  const verifiedDisplay = verifiedAt ? formatVerifiedAt(verifiedAt) : "";

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ alignItems: "center", gap: spacing.md }}>
          <CheckCircle color={colors.primary} size={56} strokeWidth={1.6} />
          <ScreenHeader
            eyebrow="Verified"
            title="Identity confirmed."
            meta={`Your student credential was accepted${verifiedDisplay ? ` on ${verifiedDisplay}` : ""}.`}
          />
        </View>

        <Card heading="What was shared">
          <InfoRow label="Name" value={studentName} divider />
          <InfoRow label="Faculty" value={faculty} divider />
          <InfoRow label="Valid until" value={validUntil} divider />
          <InfoRow label="Verified by" value={vendorId} divider />
          <InfoRow label="Location" value={servicePointId} />
        </Card>

        <Card surface="alt" elevation="none">
          <Text style={typography.body}>
            You're all set. Show this screen to staff if they need confirmation before you
            proceed.
          </Text>
        </Card>

        <AppButton label="Done" onPress={() => router.replace("/(wallet)/home")} size="lg" />
      </View>
    </AppScreen>
  );
}
