import { assertPaymentScope, getPaymentScope } from "@/src/features/payment/paymentScope";
import { ApiClientError } from "@/src/lib/api/apiClient";
/**
 * @fileoverview Activates a payment-only student session with student number and optional OTP.
 * @module app/(wallet)/payment-activate
 */

import { router } from "expo-router";
import { loadCheckout } from "@/src/features/payment/checkoutSession";
import { useEffect, useRef, useState } from "react";
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
async function resumeCheckout() {
  const owner = getPaymentScope();
  const pending = await loadCheckout();
  assertPaymentScope(owner);
  if (pending?.kind === "POS") router.replace({ pathname: "/(wallet)/payment-request", params: { id: pending.id } });
  else if (pending?.kind === "STATIC" && pending.amountMinor) router.replace({ pathname: "/(wallet)/payment-confirm", params: { qrIdentifier: pending.qrIdentifier, amountMinor: String(pending.amountMinor), idempotencyKey: pending.idempotencyKey } });
  else if (pending?.kind === "STATIC") router.replace({ pathname: "/(wallet)/payment-amount", params: { qrIdentifier: pending.qrIdentifier } });
  else router.replace("/(wallet)/payments");
}

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
  const operationInFlight = useRef(false);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const resendSeconds = Math.max(0, Math.ceil((Math.max(retryAt, challenge?.resendAvailableAt ? Date.parse(challenge.resendAvailableAt) : 0) - now) / 1000));
  const expired = Boolean(challenge?.expiresAt && Date.parse(challenge.expiresAt) <= now);

  async function requestOtp() {
    if (operationInFlight.current || resendSeconds > 0) return;
    const normalizedStudentNumber = studentNumber.trim();
    if (!normalizedStudentNumber) {
      setError("Enter your student number.");
      return;
    }

    const owner = getPaymentScope();
    operationInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const deviceId = await getOrCreatePaymentDeviceId();
      assertPaymentScope(owner);
      const nextChallenge = await requestPaymentActivation({
        studentNumber: normalizedStudentNumber,
        deviceId,
      });
      assertPaymentScope(owner);
      if (isPaymentSessionResponse(nextChallenge)) {
        await savePaymentSession(nextChallenge, owner);
        await resumeCheckout();
        return;
      }
      setChallenge({ ...nextChallenge, resendAvailableAt: nextChallenge.resendAvailableAt ?? new Date(Date.now() + 60000).toISOString() });
      setOtp("");
      setNow(Date.now());
      setStage("otp");
    } catch (caught) {
      if (owner.generation !== getPaymentScope().generation) return;
      if (caught instanceof ApiClientError && caught.code === "PAYMENT_OTP_DELIVERY_FAILED") {
        setChallenge(null); setOtp(""); setStage("studentNumber"); setRetryAt(Date.now() + 60000);
      }
      const failure = paymentActivationFailure(caught);
      setError(failure.message);
    } finally {
      operationInFlight.current = false;
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!challenge || operationInFlight.current) return;
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit code.");
      return;
    }

    const owner = getPaymentScope();
    operationInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const deviceId = await getOrCreatePaymentDeviceId();
      assertPaymentScope(owner);
      const session = await verifyPaymentActivation({
        challengeId: challenge.challengeId,
        otp,
        deviceId,
      });
      await savePaymentSession(session, owner);
      await resumeCheckout();
    } catch (caught) {
      if (owner.generation !== getPaymentScope().generation) return;
      if (caught instanceof ApiClientError && caught.code === "PAYMENT_OTP_DELIVERY_FAILED") {
        setChallenge(null); setOtp(""); setStage("studentNumber"); setRetryAt(Date.now() + 60000);
      }
      const failure = paymentActivationFailure(caught);
      setError(failure.message);
    } finally {
      operationInFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <AppScreen
      footer={
        <View style={{ gap: spacing.sm }}>
          <AppButton
            disabled={busy || (stage === "studentNumber" && resendSeconds > 0)}
            label={stage === "studentNumber" && resendSeconds > 0 ? `Retry code in ${resendSeconds}s` : busy ? "Checking..." : "Activate payments"}
            onPress={() => void (stage === "studentNumber" ? requestOtp() : verifyOtp())}
            size="lg"
          />
          <AppButton disabled={busy} label="Cancel" onPress={() => router.replace("/(wallet)/payments")} variant="secondary" />
          {stage === "otp" ? (
            <>
              <AppButton disabled={busy || resendSeconds > 0} label={resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"} onPress={() => void requestOtp()} variant="secondary" />
              <AppButton disabled={busy} label="Change student number" onPress={() => { setStage("studentNumber"); setChallenge(null); setOtp(""); setError(null); }} variant="secondary" />
            </>
          ) : null}
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
                If this student number is registered, a code has been sent to the university email on record.
              </Text>
            ) : null}
            {stage === "otp" && challenge?.expiresAt ? (
              <Text accessibilityLiveRegion="polite" style={typography.body}>
                {expired ? "This code may have expired. Request another code. The server checks its validity when you submit." : `Code expires in ${Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - now) / 60000))} minutes.`}
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
