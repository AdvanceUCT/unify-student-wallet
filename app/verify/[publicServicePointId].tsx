/**
 * @fileoverview Starts verification from a static service-point identifier.
 * @module app/verify/[publicServicePointId]
 */

import { useLocalSearchParams } from "expo-router";

import { VerificationFlowScreen } from "@/src/features/verification/VerificationFlowScreen";

export default function VerifyServicePointScreen() {
  const params = useLocalSearchParams<{ publicServicePointId?: string | string[] }>();
  const publicServicePointId = Array.isArray(params.publicServicePointId)
    ? params.publicServicePointId[0]
    : params.publicServicePointId;

  return <VerificationFlowScreen target={{ kind: "servicePoint", publicServicePointId }} />;
}
