import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PaymentAmountScreen from "@/app/(wallet)/payment-amount";
import PaymentConfirmScreen from "@/app/(wallet)/payment-confirm";
import PaymentResultScreen from "@/app/(wallet)/payment-result";
import { ApiClientError } from "@/src/lib/api/apiClient";
import { submitPayment } from "@/src/features/payment/paymentApi";

const mockRefetch = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockIsPaymentOnline = jest.fn(async () => true);
let mockOffline = false;
let mockParams: Record<string, string> = {};
let mockDestinationQuery: {
  data?: { vendorName: string; branchName: string; currency: "ZAR" };
  error?: Error | null;
  isLoading: boolean;
  refetch: jest.Mock;
};

const destination = { vendorName: "Campus Coffee", branchName: "Main Library", currency: "ZAR" as const };
const receipt = {
  ...destination,
  transactionId: "transaction-001",
  amountMinor: 4575,
  resultingBalanceMinor: 5425,
  completedAt: "2026-09-09T12:00:00.000Z",
  status: "COMPLETED" as const,
};

jest.mock("expo-crypto", () => ({ randomUUID: jest.fn(() => "payment-request-001") }));

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: () => mockDestinationQuery,
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

jest.mock("@/src/features/payment/network", () => ({
  isPaymentOnline: () => mockIsPaymentOnline(),
  usePaymentNetworkStatus: () => ({ isOffline: mockOffline }),
}));

jest.mock("@/src/features/payment/paymentApi", () => ({
  resolvePaymentDestination: jest.fn(),
  submitPayment: jest.fn(),
}));

jest.mock("@/src/features/theme/ThemePreferenceProvider", () => ({
  useThemePalette: () => require("@/src/theme/colors").lightColors,
}));

describe("payment screens", () => {
  const routerMock = jest.requireMock("expo-router").router as {
    back: jest.Mock;
    push: jest.Mock;
    replace: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOffline = false;
    mockParams = { qrIdentifier: "branch_qr-001" };
    mockDestinationQuery = { data: destination, error: null, isLoading: false, refetch: mockRefetch };
    mockIsPaymentOnline.mockResolvedValue(true);
    jest.mocked(submitPayment).mockResolvedValue(receipt);
  });

  it("resolves the destination and converts the entered ZAR amount to cents", () => {
    const screen = render(<PaymentAmountScreen />);

    expect(screen.getByText("Campus Coffee")).toBeTruthy();
    expect(screen.getByText("Main Library")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Amount (ZAR)"), "45.75");
    fireEvent.press(screen.getByText("Review payment"));

    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: "/(wallet)/payment-confirm",
      params: {
        amountMinor: "4575",
        idempotencyKey: "payment-request-001",
        qrIdentifier: "branch_qr-001",
      },
    });
  });

  it("keeps invalid money input on the amount screen", () => {
    const screen = render(<PaymentAmountScreen />);

    fireEvent.changeText(screen.getByLabelText("Amount (ZAR)"), "12.345");
    fireEvent.press(screen.getByText("Review payment"));

    expect(screen.getByText("Use a valid amount with no more than two decimal places.")).toBeTruthy();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("blocks confirmation when connectivity changes before submission", async () => {
    mockParams = {
      qrIdentifier: "branch_qr-001",
      amountMinor: "4575",
      idempotencyKey: "payment-request-001",
    };
    mockIsPaymentOnline.mockResolvedValueOnce(false);
    const screen = render(<PaymentConfirmScreen />);

    fireEvent.press(screen.getByText("Pay R 45.75"));

    await waitFor(() => expect(screen.getByText("You're offline")).toBeTruthy());
    expect(submitPayment).not.toHaveBeenCalled();
  });

  it("submits once and shows only a server-confirmed receipt", async () => {
    mockParams = {
      qrIdentifier: "branch_qr-001",
      amountMinor: "4575",
      idempotencyKey: "payment-request-001",
    };
    const screen = render(<PaymentConfirmScreen />);
    const payButton = screen.getByText("Pay R 45.75");

    fireEvent.press(payButton);
    fireEvent.press(payButton);

    await waitFor(() => expect(submitPayment).toHaveBeenCalledTimes(1));
    expect(submitPayment).toHaveBeenCalledWith({
      amountMinor: 4575,
      idempotencyKey: "payment-request-001",
      qrIdentifier: "branch_qr-001",
    });
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith({
      pathname: "/(wallet)/payment-result",
      params: expect.objectContaining({ transactionId: "transaction-001" }),
    }));
  });

  it("explains an uncertain timeout and retries with the same idempotency key", async () => {
    mockParams = {
      qrIdentifier: "branch_qr-001",
      amountMinor: "4575",
      idempotencyKey: "payment-request-001",
    };
    jest.mocked(submitPayment)
      .mockRejectedValueOnce(new ApiClientError("timed out", "timeout", undefined, undefined, "request-401"))
      .mockResolvedValueOnce(receipt);
    const screen = render(<PaymentConfirmScreen />);

    fireEvent.press(screen.getByText("Pay R 45.75"));
    await waitFor(() => expect(screen.getByText("Payment not confirmed")).toBeTruthy());
    expect(screen.getByText("Reference: request-401")).toBeTruthy();

    fireEvent.press(screen.getByText("Retry payment"));
    await waitFor(() => expect(submitPayment).toHaveBeenCalledTimes(2));
    expect(jest.mocked(submitPayment).mock.calls[0][0].idempotencyKey).toBe("payment-request-001");
    expect(jest.mocked(submitPayment).mock.calls[1][0].idempotencyKey).toBe("payment-request-001");
  });

  it("disables the payment action while the network hook reports offline", () => {
    mockOffline = true;
    mockParams = {
      qrIdentifier: "branch_qr-001",
      amountMinor: "4575",
      idempotencyKey: "payment-request-001",
    };
    const screen = render(<PaymentConfirmScreen />);

    expect(screen.getByText("You are offline. Reconnect to enable payment.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pay R 45.75" }).props.accessibilityState).toEqual({ disabled: true });
  });

  it("renders the successful server receipt and returns to payments", () => {
    mockParams = {
      amountMinor: "4575",
      resultingBalanceMinor: "5425",
      transactionId: "transaction-001",
      vendorName: "Campus Coffee",
      branchName: "Main Library",
      completedAt: "2026-09-09T12:00:00.000Z",
    };
    const screen = render(<PaymentResultScreen />);

    expect(screen.getByText("Paid")).toBeTruthy();
    expect(screen.getByText("R 45.75")).toBeTruthy();
    expect(screen.getByText("R 54.25")).toBeTruthy();
    expect(screen.getByText("transaction-001")).toBeTruthy();
    fireEvent.press(screen.getByText("Done"));
    expect(routerMock.replace).toHaveBeenCalledWith("/(wallet)/payments");
  });
});
