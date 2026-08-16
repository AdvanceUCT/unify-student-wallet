/**
 * @fileoverview Coordinates proof receipt, credential selection, explicit consent, presentation, and result polling.
 * @module features/verification/VerificationFlowScreen
 */

import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import { Clock3, Store } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { BrandGradient } from "@/src/components/BrandGradient";
import { OperationStateScreen } from "@/src/components/OperationStateScreen";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { VerificationConsentPanel } from "@/src/components/VerificationConsentPanel";
import { addVerificationActivity } from "@/src/features/verification/activityHistory";
import { isAbortError, WalletVerificationError } from "@/src/features/verification/verificationErrors";
import { formatCredentialLabel, formatCredentialValue } from "@/src/features/wallet/credentialDisplay";
import {
  acceptVerificationProofLazy,
  receiveVerificationProofRequestLazy,
  selectVerificationCredentialsLazy,
} from "@/src/features/wallet/holderAgentRuntime";
import type { VerificationProofSelection } from "@/src/features/wallet/holderAgent";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useAutoLock } from "@/src/features/wallet/AutoLockProvider";
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
export type VerificationProgressStep = "opening-request" | "receiving-request" | "matching-credential" | "building-proof" | "awaiting-verifier";
type FlowErrorKind = "before-sharing" | "after-sharing" | "cancelled" | "request";

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
  return ATTRIBUTE_LABELS[attribute] ?? formatCredentialLabel(attribute);
}

const PROGRESS_COPY: Record<VerificationProgressStep, { eyebrow: string; title: string; message: string; detail?: string }> = {
  "opening-request": { eyebrow: "Secure request", title: "Opening verification", message: "Connecting to the verifier and preparing this wallet.", detail: "No information has been shared." },
  "receiving-request": { eyebrow: "Verifier request", title: "Receiving request", message: "Loading the exact values requested by the verifier.", detail: "No information has been shared." },
  "matching-credential": { eyebrow: "Credential match", title: "Matching credential", message: "Checking this wallet for a credential that contains the requested values.", detail: "No information has been shared." },
  "building-proof": { eyebrow: "Credential presentation", title: "Sharing approved values", message: "Building and sending a privacy-preserving proof from the credential you selected.", detail: "Keep UNIFY open while the proof is sent." },
  "awaiting-verifier": { eyebrow: "Verifier response", title: "Checking the result", message: "The proof was sent. Waiting for the verifier's authoritative decision." },
};

function resultMessage(result: VerificationResult) {
  if (result.failureCode) return verificationFailureMessage(result.failureCode);
  if (result.status === "Approved") return "The verifier accepted the credential values you presented.";
  if (result.status === "Declined") return "The verifier did not accept this credential presentation.";
  if (result.status === "Expired") return "This verification session ended before it could be completed.";
  return "The verifier could not complete this credential presentation.";
}

function classifyFlowError(error: unknown, connectionStage: "before-sharing" | "after-sharing"): FlowErrorKind {
  if (isAbortError(error) || (error instanceof ApiClientError && error.kind === "cancelled")) return "cancelled";
  if (error instanceof ApiClientError && (error.kind === "network" || error.kind === "timeout")) return connectionStage;
  return "request";
}

function interruptionCopy(kind: Exclude<FlowErrorKind, "request">, message: string) {
  if (kind === "after-sharing") {
    return {
      title: "Result connection lost",
      message,
      detail: "Your proof may already have been sent. Check the existing result before trying another verification.",
    };
  }
  if (kind === "cancelled") {
    return {
      title: "Verification was interrupted",
      message,
      detail: "The verification flow ended unexpectedly. You can safely resume or return to your wallet.",
    };
  }
  return {
    title: "Connection lost",
    message,
    detail: "No credential information was shared.",
  };
}

async function persistVerificationActivity({
  proofExchangeId,
  result,
  session,
  values,
  walletId,
}: {
  proofExchangeId?: string;
  result: VerificationResult;
  session?: StartVerificationSessionResult | null;
  values: Record<string, string>;
  walletId?: string;
}) {
  if (!session || !proofExchangeId || !walletId || result.status === "Pending") return;

  try {
    await addVerificationActivity({
      id: session.verificationRequestId,
      walletId,
      proofExchangeId,
      verifierName: session.vendorName,
      servicePointName: session.servicePointName,
      status: result.status,
      failureCode: result.failureCode,
      disclosedValues: session.requestedAttributes.flatMap((name) =>
        values[name] === undefined ? [] : [{ name: attributeLabel(name), value: values[name] }],
      ),
      occurredAt: result.completedAt ?? new Date().toISOString(),
    });
  } catch (error) {
    console.error("[verification-activity] Unable to save verification result.", error);
  }
}

/**
 * Runs one service-point or checkout proof flow from session preparation through
 * explicit student consent and the verifier's terminal result.
 */
export function VerificationFlowScreen({ target }: { target: VerificationTarget }) {
  const { ensureWalletReady } = useHolderAgent();
  const { resumeAutoLock, suspendAutoLock } = useAutoLock();
  const { clearPendingFlow, pendingCheckoutVerification, session, setPendingCheckoutVerification, setPendingVerificationPublicServicePointId } = useWalletSession();
  const clientRequestIdRef = useRef(Crypto.randomUUID());
  const controllerRef = useRef<AbortController | null>(null);
  const preparationRef = useRef<Promise<void> | null>(null);
  const autoPreparedTargetRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progressStep, setProgressStep] = useState<VerificationProgressStep>("opening-request");
  const [sessionInfo, setSessionInfo] = useState<StartVerificationSessionResult | null>(null);
  const [selection, setSelection] = useState<VerificationProofSelection | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<FlowErrorKind>("request");

  const targetId = target.kind === "checkout" ? target.verificationRequestId : target.publicServicePointId;
  const claimToken = target.kind === "checkout" ? target.claimToken : undefined;
  const missingTargetMessage = target.kind === "checkout" ? "This checkout verification link is incomplete." : "This verification link is missing a service-point ID.";
  const holdsAutoLock = phase === "loading" || phase === "presenting" || phase === "polling";

  useEffect(() => {
    if (!holdsAutoLock) return;
    const suspensionKey = "verification-flow";
    suspendAutoLock(suspensionKey);
    return () => resumeAutoLock(suspensionKey);
  }, [holdsAutoLock, resumeAutoLock, suspendAutoLock]);

  const preparePresentation = useCallback(async () => {
    // React effects and retry actions can converge here. Share the in-flight
    // promise so one screen cannot claim or open the same session twice.
    if (preparationRef.current) return preparationRef.current;

    const preparation = (async () => {
    if (!targetId || (target.kind === "checkout" && !claimToken)) {
      setError(missingTargetMessage);
      setPhase("error");
      return;
    }
    if (!session.walletId) {
      setError("Unlock this wallet before starting verification.");
      setPhase("error");
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setErrorKind("request");
    setResult(null);
    setSelection(null);
    setProgressStep("opening-request");
    setPhase("loading");

    let started: StartVerificationSessionResult | undefined;
    let proofRecordId: string | undefined;
    try {
      await ensureWalletReady(session.walletId);
      if (controller.signal.aborted) return;
      const savedClaim =
        target.kind === "checkout" &&
        pendingCheckoutVerification?.verificationRequestId === targetId
          ? pendingCheckoutVerification.claimedSession
          : undefined;
      // Checkout claim tokens are single-use capabilities. Persist the claimed
      // session so an app lock or restart resumes it instead of consuming it again.
      started = target.kind === "checkout"
        ? savedClaim ?? await claimCheckoutVerificationSession(targetId, claimToken!, controller.signal)
        : await startVerificationSession(targetId, clientRequestIdRef.current, controller.signal);
      if (target.kind === "checkout" && !savedClaim) {
        await setPendingCheckoutVerification({
          verificationRequestId: targetId,
          claimToken: claimToken!,
          claimedSession: started,
        });
      }
      setSessionInfo(started);
      setProgressStep("receiving-request");
      const proof = await receiveVerificationProofRequestLazy(started.invitationUrl, controller.signal);
      proofRecordId = proof.id;
      setProgressStep("matching-credential");
      const selected = await selectVerificationCredentialsLazy(proof.id, started.requestedAttributes);
      if (controller.signal.aborted) return;
      if (target.kind === "servicePoint") await setPendingVerificationPublicServicePointId(undefined);
      setSelection(selected);
      setPhase("review");
    } catch (caught) {
      if (controller.signal.aborted) return;
      if (
        caught instanceof WalletVerificationError &&
        caught.code !== "PROOF_REQUEST_TIMEOUT" &&
        started
      ) {
        const revoked = caught.code === "CREDENTIAL_REVOKED";
        const verificationResult: VerificationResult = {
          status: revoked ? "Declined" : "Failed",
          failureCode: revoked ? "CREDENTIAL_NOT_CURRENT" : "REVOCATION_CHECK_FAILED",
          expiresAt: started.expiresAt,
          completedAt: new Date().toISOString(),
        };
        await persistVerificationActivity({
          proofExchangeId: caught.proofRecordId ?? proofRecordId,
          result: verificationResult,
          session: started,
          values: {},
          walletId: session.walletId,
        });
        await clearPendingFlow(target.kind === "checkout" ? "checkout" : "servicePoint");
        setResult(verificationResult);
        setPhase("result");
        return;
      }
      setError(
        caught instanceof WalletVerificationError && caught.code === "PROOF_REQUEST_TIMEOUT"
          ? caught.message
          : verificationRequestErrorMessage(caught),
      );
      setErrorKind(
        caught instanceof WalletVerificationError && caught.code === "PROOF_REQUEST_TIMEOUT"
          ? "before-sharing"
          : classifyFlowError(caught, "before-sharing"),
      );
      setPhase("error");
    }
    })();

    preparationRef.current = preparation;
    try {
      await preparation;
    } finally {
      preparationRef.current = null;
    }
  }, [claimToken, clearPendingFlow, ensureWalletReady, missingTargetMessage, pendingCheckoutVerification, session.walletId, setPendingCheckoutVerification, setPendingVerificationPublicServicePointId, target.kind, targetId]);

  useEffect(() => {
    if (!targetId || (target.kind === "checkout" && !claimToken)) {
      setError(missingTargetMessage);
      setPhase("error");
      return;
    }
    if (!session.walletId || session.lockStatus !== "unlocked") {
      autoPreparedTargetRef.current = null;
      // Preserve deep links until the wallet is unlocked; route state alone does
      // not survive process death and must not cause the verification to disappear.
      if (target.kind === "checkout") void setPendingCheckoutVerification({ verificationRequestId: targetId, claimToken: claimToken! });
      else void setPendingVerificationPublicServicePointId(targetId);
      return;
    }
    const preparationKey = `${target.kind}:${targetId}`;
    if (autoPreparedTargetRef.current === preparationKey) return;
    autoPreparedTargetRef.current = preparationKey;
    void preparePresentation();
    return () => controllerRef.current?.abort();
  }, [claimToken, missingTargetMessage, preparePresentation, session.lockStatus, session.walletId, setPendingCheckoutVerification, setPendingVerificationPublicServicePointId, target.kind, targetId]);

  async function saveResult(
    authoritativeResult: VerificationResult,
    context?: {
      proofRecordId?: string;
      session: StartVerificationSessionResult;
      values: Record<string, string>;
    },
  ) {
    const activeSession = context?.session ?? sessionInfo;
    const proofExchangeId = context?.proofRecordId ?? selection?.proofRecordId;
    const values = context?.values ?? selection?.values ?? {};
    await persistVerificationActivity({
      proofExchangeId,
      result: authoritativeResult,
      session: activeSession,
      values,
      walletId: session.walletId,
    });
  }

  async function presentCredential() {
    if (!selection || !sessionInfo) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setErrorKind("request");
    setProgressStep("building-proof");
    setPhase("presenting");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let shared = false;
    try {
      // This is the consent boundary: no proof is sent until the student presses
      // Present credential on the preceding review screen.
      await acceptVerificationProofLazy(selection);
      shared = true;
      if (controller.signal.aborted) return;
      setProgressStep("awaiting-verifier");
      setPhase("polling");
      // Proof delivery is not itself approval. Only the verifier's
      // capability-protected result endpoint supplies the final decision.
      const authoritativeResult = await pollVerificationResult(sessionInfo.verificationRequestId, sessionInfo.resultToken, controller.signal);
      if (controller.signal.aborted) return;
      await saveResult(authoritativeResult);
      await clearPendingFlow(target.kind === "checkout" ? "checkout" : "servicePoint");
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
      // Retry guidance must distinguish a safe pre-share failure from an
      // ambiguous post-share failure that may already have reached the verifier.
      setErrorKind(classifyFlowError(caught, shared ? "after-sharing" : "before-sharing"));
      setPhase("error");
    }
  }

  async function checkExistingResult() {
    if (!sessionInfo) {
      await preparePresentation();
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setProgressStep("awaiting-verifier");
    setPhase("polling");
    try {
      const authoritativeResult = await pollVerificationResult(
        sessionInfo.verificationRequestId,
        sessionInfo.resultToken,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      await saveResult(authoritativeResult);
      await clearPendingFlow(target.kind === "checkout" ? "checkout" : "servicePoint");
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
      setErrorKind(classifyFlowError(caught, "after-sharing"));
      setPhase("error");
    }
  }

  async function continueToWallet() {
    await clearPendingFlow(target.kind === "checkout" ? "checkout" : "servicePoint");
    router.replace("/(wallet)/home");
  }

  async function dismissPresentation() {
    controllerRef.current?.abort();
    await clearPendingFlow(target.kind === "checkout" ? "checkout" : "servicePoint");
    router.replace("/(wallet)/home");
  }

  if (phase === "loading" || phase === "presenting" || phase === "polling") {
    const progress = PROGRESS_COPY[progressStep];
    return <OperationStateScreen busy tone={phase === "presenting" ? "secure" : "loading"} {...progress} />;
  }
  if (phase === "result" && result) {
    const approved = result.status === "Approved";
    if (result.failureCode === "CREDENTIAL_NOT_CURRENT") {
      return <OperationStateScreen tone="error" eyebrow="Credential status" title="Credential revoked" message="This credential is no longer valid and cannot be used for verification. Contact your institution if you believe this is incorrect." detail={sessionInfo ? `${sessionInfo.vendorName} · ${sessionInfo.servicePointName}` : undefined} primaryAction={{ label: "Done", onPress: () => router.replace("/(wallet)/activity") }} />;
    }
    if (result.failureCode === "REVOCATION_CHECK_FAILED") {
      return <OperationStateScreen tone="warning" eyebrow="Status check unavailable" title="Credential status could not be confirmed" message="The revocation registry could not be reached. No verification decision was made." detail={sessionInfo ? `${sessionInfo.vendorName} · ${sessionInfo.servicePointName}` : undefined} primaryAction={{ label: "Done", onPress: () => router.replace("/(wallet)/activity") }} />;
    }
    return <OperationStateScreen tone={approved ? "success" : result.status === "Expired" ? "warning" : "error"} eyebrow="Verification complete" title={approved ? "Credential verified" : result.status} message={resultMessage(result)} detail={sessionInfo ? `${sessionInfo.vendorName} · ${sessionInfo.servicePointName}` : undefined} primaryAction={{ label: "Done", onPress: () => router.replace("/(wallet)/activity") }} />;
  }
  if (phase === "error" && error) {
    if (errorKind !== "request") {
      const interruption = interruptionCopy(errorKind, error);
      return <OperationStateScreen tone="warning" eyebrow="Verification interrupted" title={interruption.title} message={interruption.message} detail={interruption.detail} primaryAction={{ label: errorKind === "after-sharing" ? "Check result" : "Try again", onPress: () => void (errorKind === "after-sharing" ? checkExistingResult() : preparePresentation()) }} secondaryAction={{ label: "Continue to wallet", onPress: () => void continueToWallet() }} />;
    }
    return <OperationStateScreen tone="warning" eyebrow="Verification unavailable" title="Could not start verification" message={error} primaryAction={{ label: "Try again", onPress: () => void preparePresentation() }} secondaryAction={{ label: "Continue to wallet", onPress: () => void continueToWallet() }} />;
  }

  return (
    <AppScreen>
      <Stack.Screen options={{ title: "Review verification" }} />
      <ScreenHeader eyebrow="Credential presentation" title="Review before sharing" meta="Only the values listed below will be presented after you approve." />
      {sessionInfo && selection ? (
        <View style={{ gap: spacing["2xl"] }}>
          <BrandGradient style={{ borderRadius: 20, padding: spacing.xl, gap: spacing.lg }}>
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
          </BrandGradient>

          <VerificationConsentPanel
            primaryAction={{ label: "Present credential", onPress: () => void presentCredential() }}
            secondaryAction={{ label: "Not now", onPress: () => void dismissPresentation() }}
            servicePointName={sessionInfo.servicePointName}
            showContext={false}
            values={sessionInfo.requestedAttributes.map((attribute) => ({ name: attribute, value: formatCredentialValue(attribute, selection.values[attribute] ?? "") }))}
            verifierName={sessionInfo.vendorName}
          />
        </View>
      ) : null}
    </AppScreen>
  );
}
