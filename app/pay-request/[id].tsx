import { useEffect } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
export default function IncomingPaymentRequest() {
 const { id } = useLocalSearchParams<{ id: string }>();
 const { setPendingPaymentRequest } = useWalletSession();
 useEffect(() => { if (typeof id === "string") void setPendingPaymentRequest(id).then(() => router.replace({ pathname: "/(wallet)/payment-request", params: { id } })).catch(() => router.replace("/(wallet)/payments")); }, [id, setPendingPaymentRequest]);
 return null;
}
