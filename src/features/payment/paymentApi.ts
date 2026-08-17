/**
 * @fileoverview Calls the admin portal's Ethereum endpoints for linking, balance, and verification.
 * @module features/payment/paymentApi
 */

import { ApiClientError, apiClient } from "@/src/lib/api/apiClient";

type LinkEthereumAddressResponse = Record<string, never>;

type FetchOnChainBalanceResponse = {
  balanceWei: string;
  balanceEth: string;
  ethAddress: string;
};

type FetchVerifiedStatusResponse = {
  verified: boolean;
  ethAddress: string;
};

function paymentApiErrorMessage(error: unknown) {
  if (!(error instanceof ApiClientError)) {
    return "The payment service could not be reached. Please try again.";
  }
  if (error.kind === "http") return error.message;
  if (error.kind === "timeout") return "The payment service timed out. Check your connection and try again.";
  if (error.kind === "cancelled") return "The request was cancelled.";
  return "The payment service is unavailable. Check that the admin portal is reachable and try again.";
}

/** Links the student's on-device Ethereum address to their student number. Call once after wallet creation. */
export async function linkEthereumAddress(
  studentNumber: string,
  studentEthAddress: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiClient.post<LinkEthereumAddressResponse>("/api/ethereum/students/link", {
      studentNumber,
      studentEthAddress,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: paymentApiErrorMessage(error) };
  }
}

/** Reads the student's campus wallet balance from the admin portal. */
export async function fetchOnChainBalance(
  ethAddress: string,
): Promise<{ ok: true; balanceWei: string; balanceEth: string } | { ok: false; error: string }> {
  try {
    const result = await apiClient.get<FetchOnChainBalanceResponse>(
      `/api/ethereum/students/${encodeURIComponent(ethAddress)}/balance`,
    );
    return { ok: true, balanceWei: result.balanceWei, balanceEth: result.balanceEth };
  } catch (error) {
    return { ok: false, error: paymentApiErrorMessage(error) };
  }
}

/** Reads the student's verified-student status from the admin portal. */
export async function fetchVerifiedStatus(
  ethAddress: string,
): Promise<{ ok: true; verified: boolean } | { ok: false; error: string }> {
  try {
    const result = await apiClient.get<FetchVerifiedStatusResponse>(
      `/api/ethereum/students/${encodeURIComponent(ethAddress)}/verified`,
    );
    return { ok: true, verified: result.verified };
  } catch (error) {
    return { ok: false, error: paymentApiErrorMessage(error) };
  }
}
