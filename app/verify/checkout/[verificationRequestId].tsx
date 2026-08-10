/**
 * @fileoverview Claims and presents against a single-use checkout verification capability.
 * @module app/verify/checkout/[verificationRequestId]
 */

import { useLocalSearchParams } from "expo-router";

import { VerificationFlowScreen } from "@/src/features/verification/VerificationFlowScreen";

export default function VerifyCheckoutScreen() {
  const params = useLocalSearchParams<{
    verificationRequestId?: string | string[];
    token?: string | string[];
  }>();
  const verificationRequestId = Array.isArray(params.verificationRequestId)
    ? params.verificationRequestId[0]
    : params.verificationRequestId;
  const claimToken = Array.isArray(params.token) ? params.token[0] : params.token;

  return (
    <VerificationFlowScreen
      target={{ kind: "checkout", verificationRequestId, claimToken }}
    />
  );
}
