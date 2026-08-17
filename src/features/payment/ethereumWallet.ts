/**
 * @fileoverview Manages the student's on-device Ethereum payment wallet and Sepolia provider.
 * @module features/payment/ethereumWallet
 */

import Constants from "expo-constants";
import { ethers } from "ethers";

import { getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

const ETH_PRIVATE_KEY_STORAGE_KEY = "unify_eth_private_key";

export type EthereumWalletErrorCode =
  | "NO_PROVIDER"
  | "CONTRACT_ERROR"
  | "INSUFFICIENT_BALANCE"
  | "WALLET_NOT_FOUND";

export class EthereumWalletError extends Error {
  constructor(
    message: string,
    public code: EthereumWalletErrorCode,
  ) {
    super(message);
    this.name = "EthereumWalletError";
  }
}

/** Loads the student's stored Ethereum wallet, or creates and persists one if none exists. */
export async function createOrLoadEthereumWallet(): Promise<ethers.Wallet> {
  const storedPrivateKey = await getSecureValue(ETH_PRIVATE_KEY_STORAGE_KEY);

  if (storedPrivateKey) {
    try {
      return new ethers.Wallet(storedPrivateKey);
    } catch {
      throw new EthereumWalletError("The stored payment wallet key could not be read.", "WALLET_NOT_FOUND");
    }
  }

  const generatedWallet = ethers.Wallet.createRandom();
  await saveSecureValue(ETH_PRIVATE_KEY_STORAGE_KEY, generatedWallet.privateKey);
  return new ethers.Wallet(generatedWallet.privateKey);
}

/** Returns the student's public Ethereum address, safe to share or display. */
export async function getEthereumAddress(): Promise<string> {
  const wallet = await createOrLoadEthereumWallet();
  return wallet.address;
}

let cachedProvider: ethers.JsonRpcProvider | null = null;

/** Returns a cached JSON-RPC provider for the configured Sepolia endpoint. */
export function getProvider(): ethers.JsonRpcProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const rpcUrl: string | undefined =
    Constants.expoConfig?.extra?.ethereumRpcUrl ?? process.env.EXPO_PUBLIC_ETHEREUM_RPC_URL;

  if (!rpcUrl) {
    throw new EthereumWalletError("No Ethereum RPC URL is configured for the payment wallet.", "NO_PROVIDER");
  }

  cachedProvider = new ethers.JsonRpcProvider(rpcUrl);
  return cachedProvider;
}
