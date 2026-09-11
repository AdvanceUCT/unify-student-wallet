/**
 * @fileoverview Activates a payment-only student session with student number and optional OTP.
 * @module app/(wallet)/payment-activate
 */

import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppTextField } from "@/src/components/AppTextField";
import { Card } from "@/src/components/Card";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import {
  requestPaymentActivation,
  verifyPaymentActivation,
  type PaymentActivationChallenge,
  type PaymentSessionResponse,
} from "@/src/features/payment/paymentApi";
import { paymentActivationFailure } from "@/src/features/payment/paymentErrors";
import {
  getOrCreatePaymentDeviceId,
  savePaymentSession,
} from "@/src/features/payment/paymentSession";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type Stage = "studentNumber" | "otp";

function isPaymentSessionResponse(value: PaymentActivationChallenge | PaymentSessionResponse): value is PaymentSessionResponse {
  return "accessToken" in value;
}

export default function PaymentActivateScreen() {
  const colors = useThemePalette();
  const [stage, setStage] = useState<Stage>("studentNumber");
  const [studentNumber, setStudentNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [challenge, setChallenge] = useState<PaymentActivationChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestOtp() {
    const normalizedStudentNumber = studentNumber.trim();
    if (!normalizedStudentNumber) {
      setError("Enter your student number.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const deviceId = await getOrCreatePaymentDeviceId();
      const nextChallenge = await requestPaymentActivation({
        studentNumber: normalizedStudentNumber,
        deviceId,
      });
      if (isPaymentSessionResponse(nextChallenge)) {
        await savePaymentSession(nextChallenge);
        router.replace("/(wallet)/payments");
        return;
      }
      setChallenge(nextChallenge);
      setStage("otp");
    } catch (caught) {
      const failure = paymentActivationFailure(caught);
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!challenge) return;
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit code.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const deviceId = await getOrCreatePaymentDeviceId();
      const session = await verifyPaymentActivation({
        challengeId: challenge.challengeId,
        otp,
        deviceId,
      });
      await savePaymentSession(session);
      router.replace("/(wallet)/payments");
    } catch (caught) {
      const failure = paymentActivationFailure(caught);
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppScreen
      footer={
        <View style={{ gap: spacing.sm }}>
          <AppButton
            disabled={busy}
            label={busy ? "Checking..." : "Activate payments"}
            onPress={() => void (stage === "studentNumber" ? requestOtp() : verifyOtp())}
            size="lg"
          />
          <AppButton disabled={busy} label="Cancel" onPress={() => router.replace("/(wallet)/payments")} variant="secondary" />
        </View>
      }
    >
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          eyebrow="Payment activation"
          title={stage === "studentNumber" ? "Verify your student number" : "Enter the code"}
          meta="This creates a payment session only. Your credential is not used as payment authentication."
        />

        <Card elevation="sm">
          <View style={{ gap: spacing.lg }}>
            {stage === "studentNumber" ? (
              <AppTextField
                autoCapitalize="characters"
                autoCorrect={false}
                label="Student number"
                onChangeText={(value) => {
                  setStudentNumber(value);
                  setError(null);
                }}
                placeholder="Enter your student number"
                returnKeyType="done"
                value={studentNumber}
              />
            ) : (
              <AppTextField
                keyboardType="number-pad"
                label="6-digit code"
                maxLength={6}
                onChangeText={(value) => {
                  setOtp(value.replace(/\D/g, "").slice(0, 6));
                  setError(null);
                }}
                placeholder="000000"
                returnKeyType="done"
                value={otp}
              />
            )}
            {stage === "otp" ? (
              <Text style={typography.body}>
                We sent a one-time code to the email linked to student number {studentNumber.trim()}.
              </Text>
            ) : null}
          </View>
        </Card>

        {error ? (
          <Text accessibilityLiveRegion="assertive" style={[typography.bodyStrong, { color: colors.error }]}>
            {error}
          </Text>
        ) : null}
      </View>
    </AppScreen>
  );
}
