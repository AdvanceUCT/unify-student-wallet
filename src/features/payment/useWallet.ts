/**
 * @fileoverview Provides the central wallet state hook used by every payment screen.
 * @module features/payment/useWallet
 */

import { useCallback, useEffect, useState } from "react";

import { fetchWalletBalance, type WalletTransaction } from "./paymentApi";
import { getStudentNumberFromCredential, getValidSession } from "./paymentAuth";
import { updateCachedBalance, type PaymentSessionData } from "./paymentStorage";

export function useWallet() {
  const [sessionData, setSessionData] = useState<PaymentSessionData | null>(null);
  const [balanceCents, setBalanceCents] = useState(0);
  const [balanceZar, setBalanceZar] = useState("R 0.00");
  const [isActive, setIsActive] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCredential, setHasCredential] = useState(false);

  const refreshBalance = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchWalletBalance();
    setIsLoading(false);

    if (result.ok) {
      setBalanceCents(result.data.balanceCents);
      setBalanceZar(result.data.balanceZar);
      setIsActive(result.data.isActive);
      setTransactions(result.data.transactions);
      await updateCachedBalance(result.data.balanceCents, result.data.balanceZar);
      setError(null);
    } else {
      setError(result.error);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      setIsInitializing(true);
      const studentNumber = await getStudentNumberFromCredential();
      if (!active) return;

      if (!studentNumber) {
        setHasCredential(false);
        setIsInitializing(false);
        return;
      }

      setHasCredential(true);
      const session = await getValidSession();
      if (!active) return;

      if (session) {
        setSessionData(session);
        await refreshBalance();
      }

      if (active) setIsInitializing(false);
    })();

    return () => {
      active = false;
    };
  }, [refreshBalance]);

  return {
    sessionData,
    balanceCents,
    balanceZar,
    isActive,
    transactions,
    isLoading,
    isInitializing,
    error,
    hasCredential,
    refresh: refreshBalance,
    studentNumber: sessionData?.studentNumber ?? null,
  };
}
