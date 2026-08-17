/**
 * @fileoverview Loads the student's Ethereum payment wallet address, balance, and verification status.
 * @module features/payment/usePaymentWallet
 */

import { useCallback, useEffect, useState } from "react";

import { getEthereumAddress } from "./ethereumWallet";
import { fetchOnChainBalance, fetchVerifiedStatus } from "./paymentApi";

const MOCK_ETH_TO_ZAR_RATE = 35_000;

function formatZar(balanceEth: string) {
  const zar = Number(balanceEth) * MOCK_ETH_TO_ZAR_RATE;
  return `R ${zar.toFixed(2)}`;
}

type PaymentWalletState = {
  address: string | null;
  balanceEth: string | null;
  balanceZar: string | null;
  isVerified: boolean;
  isLoading: boolean;
  error: string | null;
};

const initialState: PaymentWalletState = {
  address: null,
  balanceEth: null,
  balanceZar: null,
  isVerified: false,
  isLoading: true,
  error: null,
};

export function usePaymentWallet() {
  const [state, setState] = useState<PaymentWalletState>(initialState);

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const address = await getEthereumAddress();
      const [balanceResult, verifiedResult] = await Promise.all([
        fetchOnChainBalance(address),
        fetchVerifiedStatus(address),
      ]);

      if (!balanceResult.ok) {
        setState((current) => ({ ...current, address, isLoading: false, error: balanceResult.error }));
        return;
      }
      if (!verifiedResult.ok) {
        setState((current) => ({ ...current, address, isLoading: false, error: verifiedResult.error }));
        return;
      }

      setState({
        address,
        balanceEth: balanceResult.balanceEth,
        balanceZar: formatZar(balanceResult.balanceEth),
        isVerified: verifiedResult.verified,
        isLoading: false,
        error: null,
      });
    } catch {
      setState((current) => ({ ...current, isLoading: false, error: "Unable to load your payment wallet." }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
