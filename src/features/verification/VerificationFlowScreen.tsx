import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import { Clock3, Store } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { OperationStateScreen } from "@/src/components/OperationStateScreen";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { VerificationConsentPanel } from "@/src/components/VerificationConsentPanel";
import { addVerificationActivity } from "@/src/features/verification/activityHistory";
import {
  acceptVerificationProof,
  receiveVerificationProofRequest,
  selectVerificationCredentials,
  type VerificationProofSelection,
} from "@/src/features/wallet/holderAgent";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { ApiClientError } from "@/src/lib/api/apiClient";
import {
  claimCheckoutVerificationSession,
  pollVerificationResult,
  startVerificationSession,
  type StartVerificationSessionResult,
  type VerificationResult,
  verificationFailureMessage,
  verificationRequestErrorMessage,
} from "@/src/lib/api/verification";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type Phase = "idle" | "loading" | "review" | "presenting" | "polling" | "result" | "error";

export type VerificationTarget =
  | { kind: "servicePoint"; publicServicePointId?: string }
  | { kind: "checkout"; verificationRequestId?: string; claimToken?: string };

const ATTRIBUTE_LABELS: Record<string, string> = {
  email: "Email",
  enrolmentStatus: "Enrolment status",
  expiresAt: "Expires",
  faculty: "Faculty",
  firstName: "First name",
  institution: "Institution",
  lastName: "Last name",
  programme: "Programme",
  studentNumber: "Student number",
  validFrom: "Valid from",
  year: "Year",
};

function attributeLabel(attribute: string) {
  return ATTRIBUTE_LABELS[attribute] ?? attribute.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (value) => value.toUpperCase());
}

function resultMessage(result: VerificationResult) {
  if (result.failureCode) return verificationFailureMessage(result.failureCode);
  if (result.status === "Approved") return "The verifier accepted the credential values you presented.";
  if (result.status === "Declined") return "The verifier did not accept this credential presentation.";
  if (result.status === "Expired") return "This verification session ended before it could be completed.";
  return "The verifier could not complete this credential presentation.";
}

export function VerificationFlowScreen({ target }: { target: VerificationTarget }) {
  const { clearPendingFlow, session, setPendingCheckoutVerification, setPendingVerificationPublicServicePointId } = useWalletSession();
  const clientRequestIdRef = useRef(Crypto.randomUUID());
  const controllerRef = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sessionInfo, setSessionInfo] = useState<StartVerificationSessionResult | null>(null);
  const [selection, setSelection] = useState<VerificationProofSelection | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targetId = target.kind === "checkout" ? target.verificationRequestId : target.publicServicePointId;
  const claimToken = target.kind === "checkout" ? target.claimToken : undefined;
  const missingTargetMessage = target.kind === "checkout" ? "This checkout verification link is incomplete." : "This verification link is missing a service-point ID.";

  const preparePresentation = useCallback(async () => {
    if (!targetId || (target.kind === "checkout" && !claimToken)) {
      setError(missingTargetMessage);
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
      const started = target.kind === "checkout"
        ? await claimCheckoutVerificationSession(targetId, claimToken!, controller.signal)
        : await startVerificationSession(targetId, clientRequestIdRef.current, controller.signal);
      setSessionInfo(started);
      const proof = await receiveVerificationProofRequest(started.invitationUrl, controller.signal);
      const selected = await selectVerificationCredentials(proof.id, started.requestedAttributes);
      if (controller.signal.aborted) return;
      if (target.kind === "checkout") await setPendingCheckoutVerification(undefined);
      else await setPendingVerificationPublicServicePointId(undefined);
      setSelection(selected);
      setPhase("review");
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(verificationRequestErrorMessage(caught));
      setPhase("error");
    }
  }, [claimToken, missingTargetMessage, setPendingCheckoutVerification, setPendingVerificationPublicServicePointId, target.kind, targetId]);

  useEffect(() => {
    if (!targetId || (target.kind === "checkout" && !claimToken)) {
      setError(missingTargetMessage);
      setPhase("error");
      return;
    }
    if (!session.walletId || session.lockStatus !== "unlocked") {
      if (target.kind === "checkout") void setPendingCheckoutVerification({ verificationRequestId: targetId, claimToken: claimToken! });
      else void setPendingVerificationPublicServicePointId(targetId);
      return;
    }
    void preparePresentation();
    return () => controllerRef.current?.abort();
  }, [claimToken, missingTargetMessage, preparePresentation, session.lockStatus, session.walletId, setPendingCheckoutVerification, setPendingVerificationPublicServicePointId, target.kind, targetId]);

  async function saveResult(authoritativeResult: VerificationResult) {
    if (!selection || !sessionInfo || !session.walletId || authoritativeResult.status === "Pending") return;
    await addVerificationActivity({
      id: sessionInfo.verificationRequestId,
      walletId: session.walletId,
      proofExchangeId: selection.proofRecordId,
      verifierName: sessionInfo.vendorName,
      servicePointName: sessionInfo.servicePointName,
      status: authoritativeResult.status,
      failureCode: authoritativeResult.failureCode,
      disclosedValues: sessionInfo.requestedAttributes.map((name) => ({ name: attributeLabel(name), value: selection.values[name] ?? "Missing" })),
      occurredAt: authoritativeResult.completedAt ?? new Date().toISOString(),
    });
  }

  async function presentCredential() {
    if (!selection || !sessionInfo) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setPhase("presenting");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await acceptVerificationProof(selection);
      if (controller.signal.aborted) return;
      setPhase("polling");
      const authoritativeResult = await pollVerificationResult(sessionInfo.verificationRequestId, sessionInfo.resultToken, controller.signal);
      if (controller.signal.aborted) return;
      await saveResult(authoritativeResult);
      setResult(authoritativeResult);
      setPhase("result");
    } catch (caught) {
      if (controller.signal.aborted) return;
      if (caught instanceof ApiClientError && caught.status === 410) {
        const expired: VerificationResult = { status: "Expired", expiresAt: sessionInfo.expiresAt };
        await saveResult(expired);
        setResult(expired);
        setPhase("result");
        return;
      }
      setError(verificationRequestErrorMessage(caught));
      setPhase("error");
    }
  }

  async function continueToWallet() {
    await clearPendingFlow(target.kind === "checkout" ? "checkout" : "servicePoint");
    router.replace("/(wallet)/home");
  }

  if (phase === "loading") return <OperationStateScreen tone="loading" eyebrow="Secure request" title="Preparing verification" message="Connecting to the verifier and finding a matching credential." detail="No information has been shared." />;
  if (phase === "presenting") return <OperationStateScreen tone="secure" eyebrow="Credential presentation" title="Sharing approved values" message="Creating a privacy-preserving proof from the credential you selected." detail="Keep UNIFY open while the proof is sent." />;
  if (phase === "polling") return <OperationStateScreen tone="loading" eyebrow="Verifier response" title="Checking the result" message="The proof was sent. Waiting for the verifier's authoritative decision." />;
  if (phase === "result" && result) {
    const approved = result.status === "Approved";
    return <OperationStateScreen tone={approved ? "success" : result.status === "Expired" ? "warning" : "error"} eyebrow="Verification complete" title={approved ? "Credential verified" : result.status} message={resultMessage(result)} detail={sessionInfo ? `${sessionInfo.vendorName} · ${sessionInfo.servicePointName}` : undefined} primaryAction={{ label: "Done", onPress: () => router.replace("/(wallet)/activity") }} />;
  }
  if (phase === "error" && error) {
    return <OperationStateScreen tone="warning" eyebrow="Verification interrupted" title="Could not complete verification" message={error} primaryAction={{ label: "Try again", onPress: () => void preparePresentation() }} secondaryAction={{ label: "Continue to wallet", onPress: () => void continueToWallet() }} />;
  }

  return (
    <AppScreen>
      <Stack.Screen options={{ title: "Review verification" }} />
      <ScreenHeader eyebrow="Credential presentation" title="Review before sharing" meta="Only the values listed below will be presented after you approve." />
      {sessionInfo && selection ? (
        <View style={{ gap: spacing["2xl"] }}>
          <View style={{ backgroundColor: colors.primaryDeep, borderRadius: 20, padding: spacing.xl, gap: spacing.lg }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
              <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft, borderRadius: 12 }}><Store color={colors.primary} size={23} /></View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={[typography.eyebrow, { color: "#B8D5C8" }]}>Verification request</Text>
                <Text style={[typography.heading, { color: colors.white }]}>{sessionInfo.vendorName}</Text>
                <Text style={[typography.body, { color: "#DDECE5" }]}>{sessionInfo.servicePointName}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingTop: spacing.md, borderTopWidth: 1, borderColor: "#3B6655" }}>
              <Clock3 color="#B8D5C8" size={15} />
              <Text style={[typography.caption, { color: "#DDECE5" }]}>Request expires at {new Date(sessionInfo.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
          </View>

          <VerificationConsentPanel
            primaryAction={{ label: "Present credential", onPress: () => void presentCredential() }}
            secondaryAction={{ label: "Not now", onPress: () => router.back() }}
            servicePointName={sessionInfo.servicePointName}
            showContext={false}
            values={sessionInfo.requestedAttributes.map((attribute) => ({ name: attributeLabel(attribute), value: selection.values[attribute] ?? "Missing" }))}
            verifierName={sessionInfo.vendorName}
          />
        </View>
      ) : null}
    </AppScreen>
  );
}
