import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { Rule } from "@/src/components/Rule";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { parseActivationLink } from "@/src/features/wallet/activationLinks";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { parseQrPayload, type QrPayload } from "@/src/lib/validation/qrPayload";
import { colors } from "@/src/theme/colors";
import { rules } from "@/src/theme/rules";
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

  async function handleRawPayload(rawPayload: string) {
    setActionResult(null);

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

  function handleServiceAction() {
    if (!scanResult) {
      return;
    }

    setActionResult(
      scanResult.payload.type === "payment"
        ? `Payment approved for ${scanResult.payload.servicePointId}.`
        : `Credential presentation approved for ${scanResult.payload.servicePointId}.`,
    );
  }

  return (
    <AppScreen>
      <View style={{ gap: spacing["2xl"] }}>
        <ScreenHeader
          eyebrow="Scan"
          title="Service QR."
          meta="Activation, payment, or verification — the wallet picks the right action."
        />

        <View style={{ gap: spacing.md }}>
          <View
            style={{
              aspectRatio: 1,
              backgroundColor: colors.ink,
              borderColor: colors.ink,
              borderWidth: rules.ink,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
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
                    top: "12%",
                    left: "12%",
                    right: "12%",
                    bottom: "12%",
                    borderColor: colors.surface,
                    borderWidth: rules.ink,
                  }}
                />
              </>
            ) : (
              <View style={{ alignItems: "center", gap: spacing.md, padding: spacing.xl }}>
                <Text style={[typography.eyebrow, { color: colors.surface }]}>Camera blocked</Text>
                <Text style={[typography.body, { color: colors.surface, textAlign: "center" }]}>
                  Camera permission is needed to scan service QR codes.
                </Text>
                <AppButton label="Allow camera" onPress={requestPermission} />
              </View>
            )}
          </View>
          <Text style={[typography.eyebrow, { textAlign: "center" }]}>
            Align QR within frame · Activation, payment, or verification
          </Text>
        </View>

        {scanError ? (
          <Text style={[typography.eyebrow, { color: colors.error }]}>{scanError}</Text>
        ) : null}

        {actionResult ? (
          <Text style={[typography.eyebrow, { color: colors.primary }]}>{actionResult}</Text>
        ) : null}

        {scanResult ? (
          <View style={{ gap: spacing.md }}>
            <Text style={typography.eyebrow}>Parsed service request</Text>
            <Rule />
            <InfoRow label="Type" value={scanResult.payload.type} tone="success" />
            <InfoRow label="Vendor" value={scanResult.payload.vendorId} />
            <InfoRow label="Service point" value={scanResult.payload.servicePointId} />
            <InfoRow
              label="Amount"
              value={
                scanResult.payload.type === "payment"
                  ? `R ${scanResult.payload.amount.toFixed(2)}`
                  : "Not required"
              }
            />
            <InfoRow label="Nonce" value={scanResult.payload.nonce} />
            <InfoRow label="Wallet" value={session.walletId ?? "—"} divider={false} />
            <View style={{ paddingTop: spacing.md }}>
              <AppButton
                label={
                  scanResult.payload.type === "payment" ? "Approve payment" : "Present credential"
                }
                onPress={handleServiceAction}
                size="lg"
              />
            </View>
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}
