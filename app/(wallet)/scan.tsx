import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { parseQrPayload, type QrPayload } from "@/src/lib/validation/qrPayload";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const demoPayload = JSON.stringify({
  vendorId: "vendor-001",
  servicePointId: "library-cafe",
  type: "payment",
  amount: 42.5,
  nonce: "demo-nonce",
});
const demoVerificationPayload = JSON.stringify({
  vendorId: "vendor-001",
  servicePointId: "main-library",
  type: "verification",
  nonce: "demo-verification-nonce",
});

type ScanResult = {
  payload: QrPayload;
  rawPayload: string;
};

export default function ScanScreen() {
  const { session } = useWalletSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);

  function handleRawPayload(rawPayload: string) {
    const result = parseQrPayload(rawPayload);

    setActionResult(null);

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
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Scan</Text>
          <Text style={typography.title}>Service QR</Text>
          <Text style={typography.body}>Scan payment and verification requests, inspect the payload, then approve the wallet action.</Text>
        </View>

        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: 8,
            borderWidth: 1,
            height: 280,
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {permission?.granted ? (
            <CameraView
              onBarcodeScanned={({ data }: { data: string }) => handleRawPayload(data)}
              style={{ height: "100%", width: "100%" }}
            />
          ) : (
            <View style={{ alignItems: "center", gap: spacing.md, padding: spacing.lg }}>
              <Text style={[typography.body, { textAlign: "center" }]}>Camera permission is needed to scan service QR codes.</Text>
              <AppButton label="Allow camera" onPress={requestPermission} />
            </View>
          )}
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppButton label="Use demo payment QR" onPress={() => handleRawPayload(demoPayload)} variant="secondary" />
          <AppButton label="Use demo verification QR" onPress={() => handleRawPayload(demoVerificationPayload)} variant="secondary" />
        </View>

        <View style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, padding: spacing.lg, gap: spacing.md }}>
          <Text style={typography.sectionTitle}>Parsed service request</Text>
          {scanResult ? (
            <>
              <InfoRow label="Type" value={scanResult.payload.type} tone="success" />
              <InfoRow label="Vendor" value={scanResult.payload.vendorId} />
              <InfoRow label="Service point" value={scanResult.payload.servicePointId} />
              <InfoRow label="Amount" value={scanResult.payload.type === "payment" ? `R ${scanResult.payload.amount.toFixed(2)}` : "Not required"} />
              <InfoRow label="Nonce" value={scanResult.payload.nonce} />
              <InfoRow label="Wallet record" value={session.credentialRecordId ?? "Demo credential"} />
              <AppButton
                label={scanResult.payload.type === "payment" ? "Approve payment" : "Present credential"}
                onPress={handleServiceAction}
              />
            </>
          ) : (
            <Text style={typography.body}>No service QR has been scanned yet.</Text>
          )}
          {scanError ? <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>{scanError}</Text> : null}
          {actionResult ? <Text style={{ color: colors.success, fontSize: 14, fontWeight: "700" }}>{actionResult}</Text> : null}
        </View>
      </View>
    </AppScreen>
  );
}
