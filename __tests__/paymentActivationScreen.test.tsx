import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import PaymentActivateScreen from "@/app/(wallet)/payment-activate";
import { requestPaymentActivation, verifyPaymentActivation } from "@/src/features/payment/paymentApi";
import { savePaymentSession } from "@/src/features/payment/paymentSession";
import { loadCheckout } from "@/src/features/payment/checkoutSession";
import { ApiClientError } from "@/src/lib/api/apiClient";

jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }));
jest.mock("@/src/features/payment/paymentApi", () => ({ requestPaymentActivation: jest.fn(), verifyPaymentActivation: jest.fn() }));
jest.mock("@/src/features/payment/paymentSession", () => ({
  ...jest.requireActual("@/src/features/payment/paymentSession"), getOrCreatePaymentDeviceId: jest.fn(async () => "phone"), savePaymentSession: jest.fn(async () => {}) }));
jest.mock("@/src/features/payment/checkoutSession", () => ({ loadCheckout: jest.fn() }));
jest.mock("@/src/features/theme/ThemePreferenceProvider", () => ({ useThemePalette: () => require("@/src/theme/colors").lightColors }));

const start = new Date("2026-09-30T12:00:00Z");
const challenge = { challengeId: "first", expiresAt: new Date(start.getTime() + 600000).toISOString(), resendAvailableAt: new Date(start.getTime() + 60000).toISOString(), destinationHint: "university email on record" };
describe("Payment OTP activation", () => {
  beforeEach(() => {
    jest.clearAllMocks(); jest.useFakeTimers(); jest.setSystemTime(start);
    jest.mocked(requestPaymentActivation).mockResolvedValue(challenge);
    jest.mocked(loadCheckout).mockResolvedValue({ version: 2, kind: "POS", id: "sale", phase: "REVIEW", idempotencyKey: "original" });
  });
  afterEach(() => jest.useRealTimers());
  async function enterCodeScreen() {
    const screen = render(<PaymentActivateScreen />);
    fireEvent.changeText(screen.getByLabelText("Student number"), "STUDENT1");
    fireEvent.press(screen.getByText("Activate payments"));
    await waitFor(() => expect(screen.getByLabelText("6-digit code")).toBeTruthy());
    return screen;
  }
  it("limits repeated requests and enables resend only after the cooldown", async () => {
    const screen = render(<PaymentActivateScreen />);
    fireEvent.changeText(screen.getByLabelText("Student number"), "STUDENT1");
    fireEvent.press(screen.getByText("Activate payments")); fireEvent.press(screen.getByText("Checking..."));
    await waitFor(() => expect(screen.getByText("Resend code in 60s")).toBeTruthy());
    expect(requestPaymentActivation).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Resend code in 60s" }).props.accessibilityState.disabled).toBe(true);
    await act(async () => jest.advanceTimersByTime(60000));
    expect(screen.getByRole("button", { name: "Resend code" }).props.accessibilityState.disabled).toBe(false);
  });
  it("replaces the challenge and clears the old code on resend", async () => {
    const screen = await enterCodeScreen();
    fireEvent.changeText(screen.getByLabelText("6-digit code"), "123456");
    await act(async () => jest.advanceTimersByTime(60000));
    jest.mocked(requestPaymentActivation).mockResolvedValueOnce({ ...challenge, challengeId: "second" });
    fireEvent.press(screen.getByText("Resend code"));
    await waitFor(() => expect(screen.getByLabelText("6-digit code").props.value).toBe(""));
    fireEvent.changeText(screen.getByLabelText("6-digit code"), "654321");
    jest.mocked(verifyPaymentActivation).mockRejectedValueOnce(new ApiClientError("invalid", "http", 401, "INVALID_WALLET_SESSION"));
    fireEvent.press(screen.getByText("Activate payments"));
    await waitFor(() => expect(verifyPaymentActivation).toHaveBeenCalledWith({ challengeId: "second", otp: "654321", deviceId: "phone" }));
    expect(screen.getByText(/The code is incorrect/)).toBeTruthy();
  });
  it("shows expiry and allows correcting the student number without reading or deleting checkout", async () => {
    const screen = await enterCodeScreen();
    await act(async () => jest.advanceTimersByTime(600000));
    expect(screen.getByText(/This code may have expired/)).toBeTruthy();
    fireEvent.press(screen.getByText("Change student number"));
    expect(screen.getByLabelText("Student number").props.value).toBe("STUDENT1");
    expect(loadCheckout).not.toHaveBeenCalled(); expect(savePaymentSession).not.toHaveBeenCalled();
  });
  it("saves the verified session before resuming the original sale and submits verification once", async () => {
    const screen = await enterCodeScreen();
    const session = { accessToken: "access", accessExpiresAt: challenge.expiresAt, refreshToken: "refresh", refreshExpiresAt: challenge.expiresAt, sessionId: "session" };
    jest.mocked(verifyPaymentActivation).mockResolvedValueOnce(session);
    jest.mocked(loadCheckout).mockImplementationOnce(async () => { expect(savePaymentSession).toHaveBeenCalledWith(session, expect.any(Object)); return { kind: "POS", id: "sale" } as Awaited<ReturnType<typeof loadCheckout>>; });
    fireEvent.changeText(screen.getByLabelText("6-digit code"), "123456");
    fireEvent.press(screen.getByText("Activate payments")); fireEvent.press(screen.getByText("Checking..."));
    await waitFor(() => expect(jest.requireMock("expo-router").router.replace).toHaveBeenCalledWith({ pathname: "/(wallet)/payment-request", params: { id: "sale" } }));
    expect(verifyPaymentActivation).toHaveBeenCalledTimes(1);
  });
});
