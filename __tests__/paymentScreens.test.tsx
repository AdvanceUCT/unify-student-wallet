import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import PaymentAmountScreen from "@/app/(wallet)/payment-amount";
import PaymentConfirmScreen from "@/app/(wallet)/payment-confirm";
import PaymentResultScreen from "@/app/(wallet)/payment-result";
import { ApiClientError } from "@/src/lib/api/apiClient";
import { getWalletBalance, getPaymentByReference, resolvePaymentDestination, submitPayment } from "@/src/features/payment/paymentApi";
import { clearCheckout, loadCheckout } from "@/src/features/payment/checkoutSession";

let mockParams: Record<string, string> = {};
let mockOffline = false;
let mockQuery: { data?: object; error?: Error; isLoading: boolean; refetch: jest.Mock };
const mockInvalidate = jest.fn();
const mockRefresh = jest.fn(async () => {});
const mockOnline = jest.fn(async () => true);
const destination = { vendorName: "Campus Coffee", branchName: "Main Library", vendorBranchId: "branch-001", currency: "ZAR" as const };
const receipt = { ...destination, transactionId: "transaction-001", amountMinor: 4575, resultingBalanceMinor: 5425, completedAt: "2026-09-30T10:00:00.000Z", status: "COMPLETED" as const, orderReference: null };
jest.mock("expo-crypto", () => ({ randomUUID: jest.fn(() => "payment-request-001") }));
jest.mock("expo-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => children, router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() }, useLocalSearchParams: () => mockParams, useFocusEffect: (callback: () => void) => { require("react").useEffect(callback, [callback]); } }));
jest.mock("@tanstack/react-query", () => ({ useQuery: () => mockQuery, useQueryClient: () => ({ invalidateQueries: mockInvalidate }) }));
jest.mock("@/src/features/payment/network", () => ({ isPaymentOnline: () => mockOnline(), usePaymentNetworkStatus: () => ({ isOffline: mockOffline }) }));
jest.mock("@/src/features/payment/paymentApi", () => ({ getWalletBalance: jest.fn(), getPaymentByReference: jest.fn(), getPaymentReceipt: jest.fn(), resolvePaymentDestination: jest.fn(), submitPayment: jest.fn() }));
jest.mock("@/src/features/payment/paymentSession", () => ({ loadPaymentSession: jest.fn(async () => ({ sessionId: "session" })) }));
jest.mock("@/src/features/wallet/WalletSessionProvider", () => ({ useWalletSession: () => ({ refreshPendingCheckout: mockRefresh }) }));
jest.mock("@/src/features/theme/ThemePreferenceProvider", () => ({ useThemePalette: () => require("@/src/theme/colors").lightColors }));
jest.mock("@/src/lib/storage/secureStore", () => {
  const values = new Map<string, string>();
  return { getSecureValue: jest.fn(async (key: string) => values.get(key) ?? null), saveSecureValue: jest.fn(async (key: string, value: string) => { values.set(key, value); }), deleteSecureValue: jest.fn(async (key: string) => { values.delete(key); }) };
});
describe("Durable checkout screens", () => {
  const router = jest.requireMock("expo-router").router;
  beforeEach(async () => {
    await clearCheckout(); jest.clearAllMocks(); mockOffline = false;
    mockParams = { qrIdentifier: "branch_qr-001", amountMinor: "4575", idempotencyKey: "payment-request-001" };
    mockQuery = { data: destination, isLoading: false, refetch: jest.fn() };
    mockOnline.mockResolvedValue(true);
    jest.mocked(resolvePaymentDestination).mockResolvedValue(destination);
    jest.mocked(getWalletBalance).mockResolvedValue({ walletAccountId: "account-001", postedBalanceMinor: 10000, currency: "ZAR", accountStatus: "ACTIVE", updatedAt: receipt.completedAt });
    jest.mocked(getPaymentByReference).mockResolvedValue({ status: "NOT_RECORDED" });
    jest.mocked(submitPayment).mockResolvedValue(receipt);
  });
  it("saves integer-cent terms and a stable key before opening review", async () => {
    const screen = render(<PaymentAmountScreen />);
    fireEvent.changeText(screen.getByLabelText("Amount (ZAR)"), "45.75"); fireEvent.press(screen.getByText("Review payment"));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: "/(wallet)/payment-confirm", params: { amountMinor: "4575", idempotencyKey: "payment-request-001", qrIdentifier: "branch_qr-001" } }));
    expect(await loadCheckout()).toMatchObject({ kind: "STATIC", amountMinor: 4575, idempotencyKey: "payment-request-001" });
  });
  it("blocks changed connectivity and repeated taps", async () => {
    const screen = render(<PaymentConfirmScreen />);
    await waitFor(() => expect(screen.getByText("Review payment")).toBeTruthy());
    mockOnline.mockResolvedValueOnce(false); fireEvent.press(screen.getByText("Pay R 45.75"));
    await waitFor(() => expect(screen.getByText("You are offline. Reconnect before approving payment.")).toBeTruthy());
    expect(submitPayment).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText("Pay R 45.75")); fireEvent.press(screen.getByText("Pay R 45.75"));
    await waitFor(() => expect(screen.getByText("Payment confirmed")).toBeTruthy());
    expect(submitPayment).toHaveBeenCalledTimes(1); expect(await loadCheckout()).toBeNull();
  });
  it("shows submitting without a leave action and persists before transmission", async () => {
    let finish!: (value: typeof receipt) => void;
    jest.mocked(submitPayment).mockImplementationOnce(async () => {
      expect(await loadCheckout()).toMatchObject({ phase: "SUBMITTED", accountId: "account-001" });
      return new Promise((resolve) => { finish = resolve; });
    });
    const screen = render(<PaymentConfirmScreen />);
    await waitFor(() => expect(screen.getByText("Review payment")).toBeTruthy()); fireEvent.press(screen.getByText("Pay R 45.75"));
    await waitFor(() => expect(screen.getByText("Processing payment")).toBeTruthy()); expect(screen.queryByText("Leave checkout")).toBeNull();
    await act(async () => finish(receipt)); await waitFor(() => expect(screen.getByText("Payment confirmed")).toBeTruthy());
  });
  it("requires a status check before explicitly retrying the original submission", async () => {
    jest.mocked(submitPayment).mockRejectedValueOnce(new ApiClientError("timed out", "timeout"));
    const screen = render(<PaymentConfirmScreen />);
    await waitFor(() => expect(screen.getByText("Review payment")).toBeTruthy()); fireEvent.press(screen.getByText("Pay R 45.75"));
    await waitFor(() => expect(screen.getByText("Payment not confirmed")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Retry same payment" }).props.accessibilityState.disabled).toBe(true);
    fireEvent.press(screen.getByText("Check payment result"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry same payment" }).props.accessibilityState.disabled).toBe(false));
    expect(submitPayment).toHaveBeenCalledTimes(1); fireEvent.press(screen.getByText("Retry same payment"));
    await waitFor(() => expect(screen.getByText("Payment confirmed")).toBeTruthy());
    expect(jest.mocked(submitPayment).mock.calls.map(([input]) => input.idempotencyKey)).toEqual(["payment-request-001", "payment-request-001"]);
  });
  it("recovers after process recreation without sending another payment", async () => {
    jest.mocked(submitPayment).mockRejectedValueOnce(new ApiClientError("lost response", "network"));
    const first = render(<PaymentConfirmScreen />);
    await waitFor(() => expect(first.getByText("Review payment")).toBeTruthy()); fireEvent.press(first.getByText("Pay R 45.75"));
    await waitFor(() => expect(first.getByText("Payment not confirmed")).toBeTruthy()); first.unmount();
    jest.mocked(getPaymentByReference).mockResolvedValue(receipt);
    const reopened = render(<PaymentConfirmScreen />);
    await waitFor(() => expect(reopened.getByText("Payment confirmed")).toBeTruthy()); expect(submitPayment).toHaveBeenCalledTimes(1);
  });
  it("displays a receipt from the API and does not trust route totals", () => {
    mockParams = { transactionId: receipt.transactionId, amountMinor: "1" }; mockQuery = { data: receipt, isLoading: false, refetch: jest.fn() };
    const screen = render(<PaymentResultScreen />); expect(screen.getByText("Paid")).toBeTruthy(); expect(screen.getByText("R 45.75")).toBeTruthy();
    fireEvent.press(screen.getByText("Done")); expect(router.replace).toHaveBeenCalledWith("/(wallet)/payments");
  });
});
