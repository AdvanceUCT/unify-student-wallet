import { CheckoutScreen } from "@/src/features/payment/CheckoutScreen";
export default function PaymentConfirmScreen() {
  return <CheckoutScreen input={{ kind: "LEGACY" }} />;
}
