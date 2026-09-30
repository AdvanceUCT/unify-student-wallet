import { useLocalSearchParams } from "expo-router";
import { CheckoutScreen } from "@/src/features/payment/CheckoutScreen";
export default function PaymentConfirmScreen() {
  const params = useLocalSearchParams<{ qrIdentifier?: string; amountMinor?: string; idempotencyKey?: string }>();
  return <CheckoutScreen key={params.idempotencyKey} input={{ kind: "STATIC", qrIdentifier: params.qrIdentifier ?? "", amountMinor: Number(params.amountMinor), idempotencyKey: params.idempotencyKey ?? "" }} />;
}
