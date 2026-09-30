import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
export default function IncomingStaticPayment() {
  const { qrIdentifier } = useLocalSearchParams<{ qrIdentifier?: string }>();
  const { setPendingStaticQr } = useWalletSession();
  useEffect(() => { if (typeof qrIdentifier === "string") void setPendingStaticQr(qrIdentifier).catch(() => undefined); }, [qrIdentifier, setPendingStaticQr]);
  return <Text>Resume checkout after unlocking your wallet.</Text>;
}
