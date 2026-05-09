import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { ConnectionHandshakeOverlay } from "@/src/components/ConnectionHandshakeOverlay";
import { extractOobInvitation } from "@/src/features/wallet/connectionHandshake";
import { useConnectionHandshake } from "@/src/features/wallet/useConnectionHandshake";
import { parseQrPayload } from "@/src/lib/validation/qrPayload";
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

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { beginHandshake, error, issuerLabel, phase, reset } = useConnectionHandshake();
  const scannedRef = useRef(false);
  const demoResult = parseQrPayload(demoPayload);

  function handleBarcodeScan({ data }: { data: string }) {
    if (scannedRef.current || phase !== "idle") return;

    const oobUrl = extractOobInvitation(data);
    if (!oobUrl) return;

    scannedRef.current = true;
    beginHandshake(data);
  }

  function handleDismiss() {
    reset();
    scannedRef.current = false;
  }

  function handleRetry() {
    reset();
    scannedRef.current = false;
  }

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Scan</Text>
          <Text style={typography.title}>Service QR</Text>
          <Text style={typography.body}>
            Scan a service-point QR code to verify a payment request, or scan a university agent
            invitation to establish a DIDComm connection.
          </Text>
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
              style={{ height: "100%", width: "100%" }}
              onBarcodeScanned={handleBarcodeScan}
            />
          ) : (
            <View style={{ alignItems: "center", gap: spacing.md, padding: spacing.lg }}>
              <Text style={[typography.body, { textAlign: "center" }]}>
                Camera permission is needed to scan service QR codes.
              </Text>
              <AppButton label="Allow camera" onPress={requestPermission} />
            </View>
          )}
        </View>

        <View
          style={{
            borderColor: colors.border,
            borderRadius: 8,
            borderWidth: 1,
            gap: spacing.sm,
            padding: spacing.lg,
          }}
        >
          <Text style={typography.sectionTitle}>Demo QR payload</Text>
          <Text style={typography.body}>
            {demoResult.ok
              ? `Parsed ${demoResult.data.type} request for ${demoResult.data.servicePointId}`
              : "Invalid demo QR payload"}
          </Text>
        </View>
      </View>

      <ConnectionHandshakeOverlay
        error={error}
        issuerLabel={issuerLabel}
        phase={phase}
        onDismiss={handleDismiss}
        onRetry={handleRetry}
      />
    </AppScreen>
  );
}
