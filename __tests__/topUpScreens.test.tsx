import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PaymentActivateScreen from "@/app/(wallet)/payment-activate";
import TopUpAmountScreen from "@/app/(wallet)/topup-amount";
import {
  createTopUp,
  requestPaymentActivation,
  verifyPaymentActivation,
} from "@/src/features/payment/paymentApi";
import { getOrCreatePaymentDeviceId, savePaymentSession } from "@/src/features/payment/paymentSession";
import { loadPendingTopUp, savePendingTopUp } from "@/src/features/payment/topUpSession";

const mockIsPaymentOnline = jest.fn(async () => true);
let mockOffline = false;

jest.mock("expo-crypto", () => ({ randomUUID: jest.fn(() => "topup-request-001") }));

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(async () => ({ type: "success", url: "unifywallet://topup-return?topUpId=topup-001" })),
}));

jest.mock("@/src/features/payment/network", () => ({
  isPaymentOnline: () => mockIsPaymentOnline(),
  usePaymentNetworkStatus: () => ({ isOffline: mockOffline }),
}));

jest.mock("@/src/features/payment/paymentApi", () => ({
  createTopUp: jest.fn(),
  requestPaymentActivation: jest.fn(),
  verifyPaymentActivation: jest.fn(),
}));

jest.mock("@/src/features/payment/paymentSession", () => ({
  getOrCreatePaymentDeviceId: jest.fn(async () => "device-001"),
  savePaymentSession: jest.fn(),
}));

jest.mock("@/src/features/payment/topUpSession", () => ({
  loadPendingTopUp: jest.fn(async () => null),
  savePendingTopUp: jest.fn(),
}));

jest.mock("@/src/features/theme/ThemePreferenceProvider", () => ({
  useThemePalette: () => require("@/src/theme/colors").lightColors,
}));

describe("top-up and payment activation screens", () => {
  const routerMock = jest.requireMock("expo-router").router as {
    push: jest.Mock;
    replace: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOffline = false;
    mockIsPaymentOnline.mockResolvedValue(true);
    jest.mocked(loadPendingTopUp).mockResolvedValue(null);
    jest.mocked(requestPaymentActivation).mockResolvedValue({ challengeId: "challenge-001" });
    jest.mocked(verifyPaymentActivation).mockResolvedValue({
      accessToken: "access-token",
      accessExpiresAt: "2099-01-01T00:15:00.000Z",
      refreshToken: "refresh-token",
      refreshExpiresAt: "2099-01-31T00:00:00.000Z",
      sessionId: "session-001",
    });
    jest.mocked(createTopUp).mockResolvedValue({
      topUpId: "topup-001",
      reference: "PSK_ref_001",
      status: "PENDING",
      authorizationUrl: "https://checkout.paystack.test/pay/abc",
      amountMinor: 4575,
      currency: "ZAR",
    });
  });

  it("activates payments with student number and OTP, then stores only the payment session", async () => {
    const screen = render(<PaymentActivateScreen />);

    fireEvent.changeText(screen.getByLabelText("Student number"), "ABC123");
    fireEvent.press(screen.getByText("Activate payments"));

    await waitFor(() => expect(requestPaymentActivation).toHaveBeenCalledWith({
      studentNumber: "ABC123",
      deviceId: "device-001",
    }));
    fireEvent.changeText(screen.getByLabelText("6-digit code"), "123456");
    fireEvent.press(screen.getByText("Activate payments"));

    await waitFor(() => expect(verifyPaymentActivation).toHaveBeenCalledWith({
      challengeId: "challenge-001",
      otp: "123456",
      deviceId: "device-001",
    }));
    expect(getOrCreatePaymentDeviceId).toHaveBeenCalled();
    expect(savePaymentSession).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "session-001" }));
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/(wallet)/payments"));
  });

  it("activates payments directly when the server bypasses OTP for testing", async () => {
    jest.mocked(requestPaymentActivation).mockResolvedValueOnce({
      accessToken: "access-token",
      accessExpiresAt: "2099-01-01T00:15:00.000Z",
      refreshToken: "refresh-token",
      refreshExpiresAt: "2099-01-31T00:00:00.000Z",
      sessionId: "session-001",
    });
    const screen = render(<PaymentActivateScreen />);

    fireEvent.changeText(screen.getByLabelText("Student number"), "ABC123");
    fireEvent.press(screen.getByText("Activate payments"));

    await waitFor(() => expect(requestPaymentActivation).toHaveBeenCalledWith({
      studentNumber: "ABC123",
      deviceId: "device-001",
    }));
    expect(verifyPaymentActivation).not.toHaveBeenCalled();
    expect(savePaymentSession).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "session-001" }));
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/(wallet)/payments"));
  });

  it("creates a pending top-up, persists it, and opens hosted checkout in the browser", async () => {
    const WebBrowser = jest.requireMock("expo-web-browser") as {
      openAuthSessionAsync: jest.Mock;
    };
    const screen = render(<TopUpAmountScreen />);

    fireEvent.changeText(screen.getByLabelText("Amount (ZAR)"), "45.75");
    fireEvent.press(screen.getByText("Top up"));

    await waitFor(() => expect(createTopUp).toHaveBeenCalledWith({
      amountMinor: 4575,
      currency: "ZAR",
      idempotencyKey: "topup-request-001",
    }));
    expect(savePendingTopUp).toHaveBeenCalledWith(expect.objectContaining({
      amountMinor: 4575,
      idempotencyKey: "topup-request-001",
      topUpId: "topup-001",
    }));
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      "https://checkout.paystack.test/pay/abc",
      "unifywallet://topup-return?topUpId=topup-001",
    );
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith({
      pathname: "/(wallet)/topup-result",
      params: { topUpId: "topup-001", returned: "1" },
    }));
  });

  it("blocks a top-up while offline before creating a server request", async () => {
    mockIsPaymentOnline.mockResolvedValueOnce(false);
    const screen = render(<TopUpAmountScreen />);

    fireEvent.changeText(screen.getByLabelText("Amount (ZAR)"), "45.75");
    fireEvent.press(screen.getByText("Top up"));

    await waitFor(() => expect(screen.getByText("Reconnect before starting a top-up. No top-up was created.")).toBeTruthy());
    expect(createTopUp).not.toHaveBeenCalled();
    expect(savePendingTopUp).not.toHaveBeenCalled();
  });
});
