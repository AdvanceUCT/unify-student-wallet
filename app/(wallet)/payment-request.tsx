import { useLocalSearchParams } from "expo-router";
import { CheckoutScreen } from "@/src/features/payment/CheckoutScreen";
export default function PaymentRequestScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <CheckoutScreen key={id} input={{ kind: "POS", id: typeof id === "string" ? id : "" }} />;
}
