/**
 * @fileoverview Provides fail-clear connectivity checks for online-only payments.
 * @module features/payment/network
 */

import * as Network from "expo-network";

type ConnectivityState = Pick<Network.NetworkState, "isConnected" | "isInternetReachable">;

export function isExplicitlyOffline(state: ConnectivityState) {
  return state.isConnected === false || state.isInternetReachable === false;
}

export async function isPaymentOnline() {
  try {
    return !isExplicitlyOffline(await Network.getNetworkStateAsync());
  } catch {
    // An unavailable OS signal is not proof that the device is offline. The
    // request transport remains responsible for classifying actual failures.
    return true;
  }
}

export function usePaymentNetworkStatus() {
  const state = Network.useNetworkState();
  return { isOffline: isExplicitlyOffline(state) };
}
