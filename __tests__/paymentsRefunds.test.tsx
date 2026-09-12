import { render, waitFor } from "@testing-library/react-native";

import PaymentsScreen from "@/app/(wallet)/payments";

const mockRefetchActivity = jest.fn();
const mockRefetchBalance = jest.fn();
const mockUseQuery = jest.fn();
const mockLoadPaymentSession = jest.fn();
const mockLoadPendingTopUp = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(callback, [callback]);
  },
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: string[] }) => mockUseQuery(options),
}));

jest.mock("@/src/features/payment/paymentSession", () => ({
  loadPaymentSession: (...args: unknown[]) => mockLoadPaymentSession(...args),
}));

jest.mock("@/src/features/payment/topUpSession", () => ({
  loadPendingTopUp: (...args: unknown[]) => mockLoadPendingTopUp(...args),
}));

jest.mock("@/src/features/theme/ThemePreferenceProvider", () => ({
  useThemePalette: () => require("@/src/theme/colors").lightColors,
}));

describe("payments refund activity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadPaymentSession.mockResolvedValue({
      accessToken: "payment-token",
      accessExpiresAt: "2099-01-01T00:00:00.000Z",
      refreshToken: "payment-refresh",
      refreshExpiresAt: "2099-01-02T00:00:00.000Z",
      sessionId: "session-001",
    });
    mockLoadPendingTopUp.mockResolvedValue(null);
    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === "wallet-balance") {
        return {
          data: {
            accountStatus: "ACTIVE",
            currency: "ZAR",
            postedBalanceMinor: 12_500,
            updatedAt: "2026-09-12T10:00:00.000Z",
          },
          isError: false,
          isLoading: false,
          refetch: mockRefetchBalance,
        };
      }
      if (queryKey[0] === "wallet-activity") {
        return {
          data: [{
            amountMinor: 1_250,
            completedAt: "2026-09-12T09:59:00.000Z",
            createdAt: "2026-09-12T09:59:00.000Z",
            currency: "ZAR",
            direction: "CREDIT",
            id: "refund-001",
            status: "COMPLETED",
            subtitle: "Original payment to Campus Coffee",
            title: "Campus Coffee",
            type: "REFUND",
          }],
          refetch: mockRefetchActivity,
        };
      }
      return { data: undefined, isError: false, isLoading: false, refetch: jest.fn() };
    });
  });

  it("refetches wallet data on focus and labels refunds as returned money", async () => {
    const screen = render(<PaymentsScreen />);

    await waitFor(() => expect(mockLoadPaymentSession).toHaveBeenCalledWith({ allowExpired: true }));
    await waitFor(() => expect(mockRefetchBalance).toHaveBeenCalledTimes(1));
    expect(mockRefetchActivity).toHaveBeenCalledTimes(1);
    expect(screen.getByText("R 125.00")).toBeTruthy();
    expect(screen.getByText("Refund returned")).toBeTruthy();
    expect(screen.getByText("Refund from Campus Coffee")).toBeTruthy();
    expect(screen.getByText("Original payment to Campus Coffee Money was returned to your wallet.")).toBeTruthy();
    expect(screen.getByText("+R 12.50")).toBeTruthy();
  });
});
