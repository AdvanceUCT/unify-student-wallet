import { router } from "expo-router";
import { Text } from "react-native";
import { AppScreen } from "@/src/components/AppScreen";
import { AppButton } from "@/src/components/AppButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { typography } from "@/src/theme/typography";

export function StaticPaymentRetired() {
  return <AppScreen footer={<AppButton label="Done" onPress={() => router.replace("/(wallet)/payments")} />}><ScreenHeader eyebrow="UNIFY payments" title="Ask for a POS sale QR" /><Text style={typography.body}>Static payment QR codes are no longer supported. Ask the cashier to create a sale in the POS, then scan its QR code.</Text></AppScreen>;
}
