/**
 * @fileoverview Converts a student-entered amount to ETH and settles a campus payment on-chain.
 * @module features/payment/useQrPayment
 */

import Constants from "expo-constants";
import { ethers } from "ethers";
import { useCallback, useState } from "react";

import type { QrPayload } from "@/src/lib/validation/qrPayload";

import studentPaymentAbi from "./abis/studentPayment.abi.json";
import { createOrLoadEthereumWallet, getProvider } from "./ethereumWallet";
import { fetchOnChainBalance, fetchVerifiedStatus } from "./paymentApi";

const ETH_TO_ZAR_RATE = 35_000;
// ethers.encodeBytes32String reverts if the input doesn't fit in 32 bytes.
const SERVICE_POINT_ID_MAX_LENGTH = 31;

export type PaymentResult = {
  success: boolean;
  txHash?: string;
  amountPaid: string;
  discountApplied: boolean;
  servicePointId: string;
  error?: "not_verified" | "insufficient_balance" | "contract_error";
};

function studentPaymentContractAddress(): string | undefined {
  return Constants.expoConfig?.extra?.studentPaymentAddress ?? process.env.EXPO_PUBLIC_STUDENT_PAYMENT_ADDRESS;
}

function vendorSettlementAddress(): string | undefined {
  return Constants.expoConfig?.extra?.vendorEthAddress ?? process.env.EXPO_PUBLIC_VENDOR_ETH_ADDRESS;
}

export function useQrPayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const processPayment = useCallback(async (payload: QrPayload, amountZar: number): Promise<PaymentResult> => {
    setIsProcessing(true);
    setPaymentError(null);

    const failure = (error: PaymentResult["error"], message: string): PaymentResult => {
      setPaymentError(message);
      return {
        success: false,
        error,
        amountPaid: `R ${amountZar.toFixed(2)}`,
        discountApplied: false,
        servicePointId: payload.servicePointId,
      };
    };

    try {
      const amountEth = amountZar / ETH_TO_ZAR_RATE;
      const amountWei = ethers.parseEther(amountEth.toFixed(18));

      const wallet = await createOrLoadEthereumWallet();
      const address = wallet.address;

      const verifiedResult = await fetchVerifiedStatus(address);
      if (!verifiedResult.ok || !verifiedResult.verified) {
        return failure("not_verified", "Your credential must be verified before paying.");
      }

      const balanceResult = await fetchOnChainBalance(address);
      if (!balanceResult.ok) {
        return failure("insufficient_balance", "Insufficient wallet balance. Top up via the admin portal.");
      }
      const balanceWei = BigInt(balanceResult.balanceWei);
      if (balanceWei < amountWei) {
        return failure("insufficient_balance", "Insufficient wallet balance. Top up via the admin portal.");
      }

      const contractAddress = studentPaymentContractAddress();
      const vendorAddress = vendorSettlementAddress();
      if (!contractAddress || !vendorAddress) {
        // Fail loudly rather than silently settling to an unconfigured or
        // guessed address — this call moves real wallet funds.
        throw new Error("Payment contract address or vendor settlement address is not configured.");
      }

      const provider = getProvider();
      const connectedWallet = wallet.connect(provider);
      const contract = new ethers.Contract(contractAddress, studentPaymentAbi, connectedWallet);
      const servicePointBytes = ethers.encodeBytes32String(
        payload.servicePointId.slice(0, SERVICE_POINT_ID_MAX_LENGTH),
      );

      const tx = await contract.pay(vendorAddress, servicePointBytes, { value: amountWei });
      const receipt = await tx.wait();

      const iface = new ethers.Interface(studentPaymentAbi);
      let discountApplied = false;
      let finalAmountWei = amountWei;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "PaymentProcessed") {
            discountApplied = Boolean(parsed.args.discountApplied);
            finalAmountWei = parsed.args.finalAmount;
          }
        } catch {
          // Logs from other contracts in the same tx won't match this ABI.
        }
      }

      const finalAmountZar = Number(ethers.formatEther(finalAmountWei)) * ETH_TO_ZAR_RATE;

      return {
        success: true,
        txHash: tx.hash,
        amountPaid: `R ${finalAmountZar.toFixed(2)}`,
        discountApplied,
        servicePointId: payload.servicePointId,
      };
    } catch (error) {
      console.error("Payment failed:", error);
      return failure("contract_error", "Payment could not be processed. Try again.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { processPayment, isProcessing, paymentError };
}
