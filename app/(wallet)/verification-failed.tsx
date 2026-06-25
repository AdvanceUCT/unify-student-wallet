import { router, useLocalSearchParams } from "expo-router";
import { XCircle } from "lucide-react-native";
import { View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import type { VerificationFailureReason } from "@/src/lib/api/verification";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

type VerificationFailedParams = {
  reason: VerificationFailureReason;
  vendorId: string;
  servicePointId: string;
};

type FailureCopy = {
  title: string;
  message: string;
  nextStep: string;
};

const FAILURE_COPY: Record<VerificationFailureReason, FailureCopy> = {
  network_error: {
    title: "Couldn't reach the verification service.",
    message: "We weren't able to connect to the verification service to confirm this credential.",
    nextStep: "Check your connection and try scanning again.",
  },
  credential_revoked: {
    title: "Credential revoked.",
    message: "This credential has been revoked and can no longer be used for verification.",
    nextStep: "Contact your faculty office to have your credential reissued.",
  },
  credential_expired: {
    title: "Credential expired.",
    message: "This credential is no longer valid because it has expired.",
    nextStep: "Renew your credential before presenting it again.",
  },
  credential_not_found: {
    title: "Credential not found.",
    message: "We couldn't find a matching credential for this request.",
    nextStep: "Make sure your credential is loaded in your wallet, then try again.",
  },
  unknown: {
    title: "Verification failed.",
    message: "This verification attempt was declined.",
    nextStep: "Try scanning again, or contact support if the problem continues.",
  },
};

export default function VerificationFailedScreen() {
  const { reason, vendorId, servicePointId } = useLocalSearchParams<VerificationFailedParams>();

  const copy = FAILURE_COPY[reason] ?? FAILURE_COPY.unknown;

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ alignItems: "center", gap: spacing.md }}>
          <XCircle color={colors.error} size={56} strokeWidth={1.6} />
          <ScreenHeader eyebrow="Not verified" title={copy.title} meta={copy.message} />
        </View>

        <Card heading="What to do next">
          <InfoRow label="Next step" value={copy.nextStep} divider />
          <InfoRow label="Vendor" value={vendorId} divider />
          <InfoRow label="Service point" value={servicePointId} />
        </Card>

        <View style={{ gap: spacing.sm }}>
          <AppButton label="Scan again" onPress={() => router.replace("/(wallet)/scan")} size="lg" />
          <AppButton
            label="Done"
            onPress={() => router.replace("/(wallet)/home")}
            variant="outline"
            size="lg"
          />
        </View>
      </View>
    </AppScreen>
  );
}
