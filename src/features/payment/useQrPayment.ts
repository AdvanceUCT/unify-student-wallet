/**
 * @fileoverview Simulates paying a campus service point after scanning a payment QR code.
 * @module features/payment/useQrPayment
 */

import { useCallback, useState } from "react";

import type { QrPayload } from "@/src/lib/validation/qrPayload";

import { getEthereumAddress } from "./ethereumWallet";
import { fetchOnChainBalance, fetchVerifiedStatus } from "./paymentApi";

const SIMULATED_PAYMENT_DELAY_MS = 1_500;
const MOCK_ZAR_TO_ETH_RATE = 35_000;

export type PaymentResult = {
  success: boolean;
  txHash?: string;
  amountPaid: string;
  discountApplied: boolean;
  servicePointId: string;
  error?: "not_verified" | "insufficient_balance" | "unknown";
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomTxHash() {
  let hex = "";
  for (let i = 0; i < 64; i++) hex += Math.floor(Math.random() * 16).toString(16);
  return `0x${hex}`;
}

export function useQrPayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const processPayment = useCallback(async (payload: QrPayload): Promise<PaymentResult> => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      const address = await getEthereumAddress();

      const verifiedResult = await fetchVerifiedStatus(address);
      if (!verifiedResult.ok || !verifiedResult.verified) {
        setPaymentError("Your credential must be verified before paying.");
        return {
          success: false,
          error: "not_verified",
          amountPaid: "R 0.00",
          discountApplied: false,
          servicePointId: payload.servicePointId,
        };
      }

      const balanceResult = await fetchOnChainBalance(address);
      const amountEth = payload.amount / MOCK_ZAR_TO_ETH_RATE;
      if (!balanceResult.ok || Number(balanceResult.balanceEth) < amountEth) {
        setPaymentError("Insufficient wallet balance. Top up via the admin portal.");
        return {
          success: false,
          error: "insufficient_balance",
          amountPaid: "R 0.00",
          discountApplied: false,
          servicePointId: payload.servicePointId,
        };
      }

      // Pilot only: the vendor Ethereum address is not wired up yet, so this
      // simulates settlement instead of calling StudentPayment.pay().
      // TODO: Replace simulation with real contract call
      // const wallet = await createOrLoadEthereumWallet()
      // const provider = getProvider()
      // const contract = new ethers.Contract(
      //   EXPO_PUBLIC_STUDENT_PAYMENT_ADDRESS,
      //   studentPaymentAbi,
      //   wallet.connect(provider)
      // )
      // const servicePointBytes = ethers.encodeBytes32String(payload.servicePointId)
      // const tx = await contract.pay(
      //   vendorEthAddress,
      //   servicePointBytes,
      //   { value: ethers.parseEther(amountEth.toString()) }
      // )
      // await tx.wait()
      // return { success: true, txHash: tx.hash, ... }
      await sleep(SIMULATED_PAYMENT_DELAY_MS);

      return {
        success: true,
        txHash: randomTxHash(),
        amountPaid: `R ${payload.amount.toFixed(2)}`,
        discountApplied: true,
        servicePointId: payload.servicePointId,
      };
    } catch {
      setPaymentError("Payment could not be processed. Try again.");
      return {
        success: false,
        error: "unknown",
        amountPaid: "R 0.00",
        discountApplied: false,
        servicePointId: payload.servicePointId,
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { processPayment, isProcessing, paymentError };
}
