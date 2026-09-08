import * as Network from "expo-network";

import { isExplicitlyOffline, isPaymentOnline } from "@/src/features/payment/network";

jest.mock("expo-network", () => ({
  getNetworkStateAsync: jest.fn(),
  NetworkStateType: { NONE: "NONE" },
  useNetworkState: jest.fn(),
}));

describe("payment network guard", () => {
  beforeEach(() => jest.clearAllMocks());

  it("blocks explicit disconnection or unreachable internet", () => {
    expect(isExplicitlyOffline({ isConnected: false, isInternetReachable: true })).toBe(true);
    expect(isExplicitlyOffline({ isConnected: true, isInternetReachable: false })).toBe(true);
  });

  it("does not treat an unknown OS signal as proof of being offline", () => {
    expect(isExplicitlyOffline({ isConnected: undefined, isInternetReachable: undefined })).toBe(false);
  });

  it("checks the latest state immediately before payment", async () => {
    jest.mocked(Network.getNetworkStateAsync).mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
      type: Network.NetworkStateType.NONE,
    });
    await expect(isPaymentOnline()).resolves.toBe(false);
  });

  it("lets the transport decide when the native state check itself fails", async () => {
    jest.mocked(Network.getNetworkStateAsync).mockRejectedValueOnce(new Error("native state unavailable"));
    await expect(isPaymentOnline()).resolves.toBe(true);
  });
});
