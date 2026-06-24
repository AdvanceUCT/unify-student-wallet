import * as Crypto from "expo-crypto";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import {
  acceptVerificationProof,
  receiveVerificationProofRequest,
  selectVerificationCredentials,
  type VerificationProofSelection,
} from "@/src/features/wallet/holderAgent";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { ApiClientError } from "@/src/lib/api/apiClient";
import {
  pollVerificationResult,
  startVerificationSession,
  type StartVerificationSessionResult,
  type VerificationResult,
} from "@/src/lib/api/verification";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type Phase = "idle" | "loading" | "review" | "presenting" | "polling" | "result" | "error";

const ATTRIBUTE_LABELS: Record<string, string> = {
  studentNumber: "Student number",
  enrolmentStatus: "Enrolment status",
  faculty: "Faculty",
  programme: "Programme",
};

function errorMessage(error: unknown) {
  if (error instanceof ApiClientError || error instanceof Error) return error.message;
  return "Verification could not be completed.";
}

function resultMessage(result: VerificationResult) {
  switch (result.status) {
    case "Approved":
      return "The verifier approved this presentation.";
    case "Declined":
      return "The verifier declined this presentation.";
    case "Expired":
      return "The verification session expired.";
    case "Failed":
      return "The verifier could not complete this verification.";
    default:
      return "Waiting for the verifier.";
  }
}

export default function VerifyServicePointScreen() {
  const params = useLocalSearchParams<{ publicServicePointId?: string | string[] }>();
  const publicServicePointId = Array.isArray(params.publicServicePointId)
    ? params.publicServicePointId[0]
    : params.publicServicePointId;
  const { session, setPendingVerificationPublicServicePointId } = useWalletSession();
  const clientRequestIdRef = useRef(Crypto.randomUUID());
  const controllerRef = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sessionInfo, setSessionInfo] = useState<StartVerificationSessionResult | null>(null);
  const [selection, setSelection] = useState<VerificationProofSelection | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preparePresentation = useCallback(async () => {
    if (!publicServicePointId) {
      setError("This verification link is missing a service-point ID.");
      setPhase("error");
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setResult(null);
    setSelection(null);
    setPhase("loading");

    try {
      const started = await startVerificationSession(
        publicServicePointId,
        clientRequestIdRef.current,
        controller.signal,
      );
      setSessionInfo(started);
      const proof = await receiveVerificationProofRequest(started.invitationUrl, controller.signal);
      const selected = await selectVerificationCredentials(proof.id, started.requestedAttributes);
      if (controller.signal.aborted) return;
      setSelection(selected);
      setPhase("review");
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(errorMessage(caught));
      setPhase("error");
    }
  }, [publicServicePointId]);

  useEffect(() => {
    if (!publicServicePointId) {
      setError("This verification link is missing a service-point ID.");
      setPhase("error");
      return;
    }

    if (!session.walletId || session.lockStatus !== "unlocked") {
      void setPendingVerificationPublicServicePointId(publicServicePointId);
      return;
    }

    void setPendingVerificationPublicServicePointId(undefined);
    void preparePresentation();

    return () => controllerRef.current?.abort();
  }, [preparePresentation, publicServicePointId, session.lockStatus, session.walletId, setPendingVerificationPublicServicePointId]);

  async function presentCredential() {
    if (!selection || !sessionInfo) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setPhase("presenting");

    try {
      await acceptVerificationProof(selection);
      if (controller.signal.aborted) return;
      setPhase("polling");
      const authoritativeResult = await pollVerificationResult(
        sessionInfo.verificationRequestId,
        sessionInfo.resultToken,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setResult(authoritativeResult);
      setPhase("result");
    } catch (caught) {
      if (controller.signal.aborted) return;
      if (caught instanceof ApiClientError && caught.status === 410) {
        setResult({ status: "Expired", expiresAt: sessionInfo.expiresAt });
        setPhase("result");
        return;
      }
      setError(errorMessage(caught));
      setPhase("error");
    }
  }

  const isBusy = phase === "loading" || phase === "presenting" || phase === "polling";
  const resultTone = result?.status === "Approved" ? "success" : result?.status === "Expired" ? "warning" : "error";

  return (
    <AppScreen contentContainerStyle={{ gap: spacing.xl }}>
      <Stack.Screen options={{ title: "Verify student access" }} />
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          eyebrow="Credential presentation"
          title="Review before sharing."
          meta="The values below stay on this device until you explicitly present them."
        />

        {isBusy ? (
          <Card>
            <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg }}>
              <ActivityIndicator color={colors.primary} />
              <Text selectable style={typography.bodyStrong}>
                {phase === "loading"
                  ? "Preparing the verifier request…"
                  : phase === "presenting"
                    ? "Presenting credential…"
                    : "Waiting for the verifier result…"}
              </Text>
            </View>
          </Card>
        ) : null}

        {sessionInfo ? (
          <Card heading="Requesting service">
            <InfoRow label="Vendor" value={sessionInfo.vendorName} divider />
            <InfoRow label="Service point" value={sessionInfo.servicePointName} divider />
            <InfoRow label="Expires" value={new Date(sessionInfo.expiresAt).toLocaleTimeString()} />
          </Card>
        ) : null}

        {selection && sessionInfo ? (
          <Card eyebrow="Shared only after approval" heading="Credential values">
            {sessionInfo.requestedAttributes.map((attribute, index) => (
              <InfoRow
                key={attribute}
                label={ATTRIBUTE_LABELS[attribute] ?? attribute}
                value={selection.values[attribute] ?? "Missing"}
                divider={index < sessionInfo.requestedAttributes.length - 1}
              />
            ))}
            {phase === "review" ? (
              <View style={{ paddingTop: spacing.lg }}>
                <AppButton label="Present credential" onPress={() => void presentCredential()} size="lg" />
              </View>
            ) : null}
          </Card>
        ) : null}

        {result ? (
          <Card eyebrow="Authoritative verifier result" heading={result.status}>
            <Text
              accessibilityLiveRegion="polite"
              selectable
              style={[typography.bodyStrong, { color: colors[resultTone] }]}
            >
              {resultMessage(result)}
            </Text>
            {result.failureCode ? (
              <Text selectable style={[typography.caption, { paddingTop: spacing.sm }]}>
                {result.failureCode}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {error ? (
          <Card>
            <Text accessibilityLiveRegion="polite" selectable style={[typography.bodyStrong, { color: colors.error }]}>
              {error}
            </Text>
            <View style={{ paddingTop: spacing.lg }}>
              <AppButton label="Retry verification" onPress={() => void preparePresentation()} variant="outline" />
            </View>
          </Card>
        ) : null}
      </View>
    </AppScreen>
  );
}
