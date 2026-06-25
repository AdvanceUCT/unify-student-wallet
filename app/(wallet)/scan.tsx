import { CameraView, useCameraPermissions } from "expo-camera";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import { Camera as CameraIcon } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { parseActivationLink } from "@/src/features/wallet/activationLinks";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { startVerificationSession } from "@/src/lib/api/verification";
import { parseQrPayload, type QrPayload } from "@/src/lib/validation/qrPayload";
import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { shadows } from "@/src/theme/shadows";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type ScanResult = {
  payload: QrPayload;
  rawPayload: string;
};

function looksLikeActivationLink(value: string) {
  return parseActivationLink(value).ok;
}

export default function ScanScreen() {
  const { processIncomingLink, session } = useWalletSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  async function handleRawPayload(rawPayload: string) {
    setActionResult(null);

    // Activation links and service requests share the scanner, so route links first.
    if (looksLikeActivationLink(rawPayload)) {
      setScanError(null);
      setScanResult(null);
      const result = await processIncomingLink(rawPayload);

      if (!result.ok) {
        setScanError(result.error);
        return;
      }

      setActionResult("Reviewing offer…");
      router.push("/(wallet)/offers");
      return;
    }

    const result = parseQrPayload(rawPayload);

    if (!result.ok) {
      setScanResult(null);
      setScanError("This QR payload is not a valid UNIFY service request.");
      return;
    }

    setScanError(null);
    setScanResult({ payload: result.data, rawPayload });
  }

  async function handleServiceAction() {
    if (!scanResult) {
      return;
    }

    if (scanResult.payload.type === "payment") {
      // Payment QR actions are simulated until the payment backend is connected.
      setActionResult(`Payment approved for ${scanResult.payload.servicePointId}.`);
      return;
    }

    if (!session.walletId) {
      setActionResult("No active wallet found. Unlock your wallet before presenting a credential.");
      return;
    }

    setIsVerifying(true);

    try {
      const clientRequestId = Crypto.randomUUID();
      const { verificationRequestId, resultToken, expiresAt } = await startVerificationSession(
        scanResult.payload.servicePointId,
        clientRequestId,
      );

      router.push({
        pathname: "/(wallet)/verifying",
        params: {
          verificationRequestId,
          resultToken,
          expiresAt,
          vendorId: scanResult.payload.vendorId,
          servicePointId: scanResult.payload.servicePointId,
        },
      });
    } catch {
      router.push({
        pathname: "/(wallet)/verification-failed",
        params: {
          reason: "network_error",
          vendorId: scanResult.payload.vendorId,
          servicePointId: scanResult.payload.servicePointId,
        },
      });
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          eyebrow="Scan"
          title="Service QR."
          meta="Activation, payment, or verification — the wallet picks the right action."
        />

        <View style={{ gap: spacing.sm }}>
          <View
            style={{
              aspectRatio: 1,
              backgroundColor: colors.ink,
              borderRadius: radii.xl,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              ...shadows.md,
            }}
          >
            {permission?.granted ? (
              <>
                <CameraView
                  onBarcodeScanned={({ data }: { data: string }) => void handleRawPayload(data)}
                  style={{ height: "100%", width: "100%" }}
                />
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: "14%",
                    left: "14%",
                    right: "14%",
                    bottom: "14%",
                    borderRadius: radii.lg,
                    borderColor: colors.surface,
                    borderWidth: 2,
                  }}
                />
              </>
            ) : (
              <View style={{ alignItems: "center", gap: spacing.md, padding: spacing.xl }}>
                <CameraIcon color={colors.surface} size={28} strokeWidth={1.6} />
                <Text style={[typography.bodyStrong, { color: colors.surface, textAlign: "center" }]}>
                  Camera access needed
                </Text>
                <Text style={[typography.body, { color: colors.surface, textAlign: "center", opacity: 0.85 }]}>
                  Allow camera permission to scan service QR codes.
                </Text>
                <AppButton label="Allow camera" onPress={requestPermission} />
              </View>
            )}
          </View>
          <Text style={[typography.caption, { textAlign: "center" }]}>
            Align QR within the frame — activation, payment, or verification.
          </Text>
        </View>

        {scanError ? (
          <Card>
            <Text style={[typography.bodyStrong, { color: colors.error }]}>{scanError}</Text>
          </Card>
        ) : null}

        {actionResult ? (
          <Card>
            <Text style={[typography.bodyStrong, { color: colors.primary }]}>{actionResult}</Text>
          </Card>
        ) : null}

        {scanResult ? (
          <Card heading="Parsed service request">
            <InfoRow label="Type" value={scanResult.payload.type} tone="success" divider />
            <InfoRow label="Vendor" value={scanResult.payload.vendorId} divider />
            <InfoRow label="Service point" value={scanResult.payload.servicePointId} divider />
            <InfoRow
              label="Amount"
              value={
                scanResult.payload.type === "payment"
                  ? `R ${scanResult.payload.amount.toFixed(2)}`
                  : "Not required"
              }
              divider
            />
            <InfoRow label="Nonce" value={scanResult.payload.nonce} divider />
            <InfoRow label="Wallet" value={session.walletId ?? "—"} />
            <View style={{ paddingTop: spacing.lg }}>
              <AppButton
                label={
                  scanResult.payload.type === "payment"
                    ? "Approve payment"
                    : isVerifying
                      ? "Verifying..."
                      : "Present credential"
                }
                onPress={handleServiceAction}
                disabled={isVerifying}
                size="lg"
              />
            </View>
          </Card>
        ) : null}
      </View>
    </AppScreen>
  );
}
