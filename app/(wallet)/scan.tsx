import { CameraView, useCameraPermissions } from "expo-camera";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { parseQrPayload } from "@/src/lib/validation/qrPayload";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const demoPayload = JSON.stringify({
  vendorId: "vendor-001",
  servicePointId: "library-cafe",
  amount: 42.5,
  nonce: "demo-nonce",
});

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const demoResult = parseQrPayload(demoPayload);

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Scan</Text>
          <Text style={typography.title}>Service QR</Text>
          <Text style={typography.body}>Camera scanning will verify service-point payment requests.</Text>
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
            <CameraView style={{ height: "100%", width: "100%" }} />
          ) : (
            <View style={{ alignItems: "center", gap: spacing.md, padding: spacing.lg }}>
              <Text style={[typography.body, { textAlign: "center" }]}>Camera permission is needed to scan service QR codes.</Text>
              <AppButton label="Allow camera" onPress={requestPermission} />
            </View>
          )}
        </View>

        <View style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, padding: spacing.lg, gap: spacing.sm }}>
          <Text style={typography.sectionTitle}>Demo QR payload</Text>
          <Text style={typography.body}>
            {demoResult.ok ? `Parsed request for ${demoResult.data.servicePointId}` : "Invalid demo QR payload"}
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}
