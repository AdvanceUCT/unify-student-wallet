import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";

import { AppScreen } from "@/src/components/AppScreen";
import { LoadingState } from "@/src/components/LoadingState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import {
  pollVerificationResult,
  VerificationPollAbortedError,
  type VerificationFailureReason,
  type VerificationStatus,
} from "@/src/lib/api/verification";

type VerifyingParams = {
  verificationRequestId: string;
  resultToken: string;
  expiresAt: string;
  vendorId: string;
  servicePointId: string;
};

function reasonForStatus(
  status: VerificationStatus,
  reason: VerificationFailureReason | undefined,
): VerificationFailureReason {
  return status === "Expired" ? "session_expired" : reason ?? "unknown";
}

export default function VerifyingScreen() {
  const { verificationRequestId, resultToken, expiresAt, vendorId, servicePointId } =
    useLocalSearchParams<VerifyingParams>();
  const hasResolvedRef = useRef(false);

  useEffect(() => {
    const abortController = new AbortController();
    const msUntilExpiry = new Date(expiresAt).getTime() - Date.now();
    const expiryTimer = setTimeout(() => abortController.abort(), Math.max(msUntilExpiry, 0));

    function resolveOnce(navigate: () => void) {
      if (hasResolvedRef.current) {
        return;
      }
      hasResolvedRef.current = true;
      clearTimeout(expiryTimer);
      navigate();
    }

    pollVerificationResult(verificationRequestId, resultToken, { signal: abortController.signal })
      .then((result) => {
        resolveOnce(() => {
          if (result.status === "Approved" && result.credential) {
            router.replace({
              pathname: "/(wallet)/verification-result",
              params: {
                studentName: result.credential.studentName,
                faculty: result.credential.faculty,
                validUntil: result.credential.validUntil,
                vendorId,
                servicePointId,
                verifiedAt: new Date().toISOString(),
              },
            });
            return;
          }

          router.replace({
            pathname: "/(wallet)/verification-failed",
            params: {
              reason: reasonForStatus(result.status, result.reason),
              vendorId,
              servicePointId,
            },
          });
        });
      })
      .catch((error: unknown) => {
        resolveOnce(() => {
          const reason: VerificationFailureReason =
            error instanceof VerificationPollAbortedError ? "session_expired" : "network_error";

          router.replace({
            pathname: "/(wallet)/verification-failed",
            params: { reason, vendorId, servicePointId },
          });
        });
      });

    return () => {
      abortController.abort();
      clearTimeout(expiryTimer);
    };
    // Intentionally run once on mount — the params identify a single verification session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppScreen>
      <ScreenHeader eyebrow="Verifying" title="Confirming your credential." meta="This will only take a moment." />
      <LoadingState heading="Waiting for the service point to respond…" />
    </AppScreen>
  );
}
