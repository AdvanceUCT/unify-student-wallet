import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import OnboardingScreen from "@/app/(auth)/onboarding";
import ResumePendingFlowScreen from "@/app/(auth)/resume";

let mockParams: { mode?: string } = {};
let mockPendingActivationUrl: string | undefined;
let mockFirstRunSetupError: string | undefined;
let mockFirstRunSetupStatus: "idle" | "preparing" | "creating" | "ready" | "error" = "ready";
let mockSessionWalletId: string | undefined = "wallet-001";
const mockCompleteOnboarding = jest.fn(async () => undefined);
const mockClearPendingFlow = jest.fn(async () => undefined);
const mockContinuePendingFlow = jest.fn(async () => ({ ok: true as const, kind: "home" as const, href: "/(wallet)/home" }));
const mockResetFirstRunSetup = jest.fn(async () => undefined);
const mockRetryFirstRunSetup = jest.fn(async () => ({ ok: true as const }));
let mockHolderAgent = { error: undefined as string | undefined, resumeWallet: jest.fn(async () => null), status: "ready" as "idle" | "initializing" | "ready" | "error" };

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated/mock");
  return { ...actual, useReducedMotion: () => true, ReduceMotion: { System: "system" } };
});

jest.mock("@/src/features/wallet/WalletSessionProvider", () => ({
  useWalletSession: () => ({
    clearPendingFlow: mockClearPendingFlow,
    completeOnboarding: mockCompleteOnboarding,
    continuePendingFlow: mockContinuePendingFlow,
    firstRunSetupError: mockFirstRunSetupError,
    firstRunSetupStatus: mockFirstRunSetupStatus,
    pendingActivationUrl: mockPendingActivationUrl,
    pendingCheckoutVerification: undefined,
    pendingOfferIds: [],
    pendingVerificationPublicServicePointId: undefined,
    resetFirstRunSetup: mockResetFirstRunSetup,
    retryFirstRunSetup: mockRetryFirstRunSetup,
    session: { authStatus: "signedIn", lockStatus: "unlocked", pendingOfferIds: [], walletId: mockSessionWalletId },
  }),
}));

jest.mock("@/src/features/wallet/HolderAgentProvider", () => ({
  useHolderAgent: () => mockHolderAgent,
}));

describe("wallet onboarding", () => {
  beforeEach(() => {
    mockParams = {};
    mockPendingActivationUrl = undefined;
    mockFirstRunSetupError = undefined;
    mockFirstRunSetupStatus = "ready";
    mockSessionWalletId = "wallet-001";
    mockCompleteOnboarding.mockClear();
    mockClearPendingFlow.mockClear();
    mockContinuePendingFlow.mockClear();
    mockResetFirstRunSetup.mockClear();
    mockRetryFirstRunSetup.mockClear();
    mockHolderAgent = { error: undefined, resumeWallet: jest.fn(async () => null), status: "ready" };
    jest.clearAllMocks();
  });

  it("shows authentic first-page content and persists Skip before resuming", async () => {
    const screen = render(<OnboardingScreen />);

    expect(screen.getByText("Your identity, at a glance.")).toBeTruthy();
    expect(screen.getByTestId("onboarding-page-identity")).toBeTruthy();
    expect(screen.getByText("UNIVERSITY OF CAPE TOWN")).toBeTruthy();
    fireEvent.press(screen.getByText("Skip"));

    await waitFor(() => expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1));
    expect(router.replace).toHaveBeenCalledWith("/(auth)/resume");
  });

  it("advances with accessibility actions and enters the wallet from page three", async () => {
    const screen = render(<OnboardingScreen />);
    const pager = screen.getByLabelText("Wallet introduction, page 1 of 3");

    fireEvent(pager, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(screen.getByTestId("onboarding-page-scan")).toBeTruthy();
    fireEvent(screen.getByLabelText("Wallet introduction, page 2 of 3"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(screen.getByTestId("onboarding-page-control")).toBeTruthy();
    fireEvent.press(screen.getByText("Enter wallet"));

    await waitFor(() => expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1));
    expect(router.replace).toHaveBeenCalledWith("/(auth)/resume");
  });

  it("closes replay to Settings without changing first-run completion", () => {
    mockParams = { mode: "replay" };
    const screen = render(<OnboardingScreen />);

    fireEvent.press(screen.getByText("Close"));

    expect(mockCompleteOnboarding).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/(wallet)/settings");
  });

  it("keeps the finishing screen visible while background setup is still running", () => {
    mockFirstRunSetupStatus = "creating";
    mockSessionWalletId = undefined;
    mockHolderAgent.status = "initializing";
    const screen = render(<OnboardingScreen />);

    fireEvent.press(screen.getByText("Skip"));

    expect(screen.getByText("Finishing setup")).toBeTruthy();
    expect(screen.getByLabelText("Finishing secure wallet setup")).toBeTruthy();
    expect(mockCompleteOnboarding).not.toHaveBeenCalled();
  });

  it("offers retry and PIN fallback when background setup fails", async () => {
    mockFirstRunSetupStatus = "error";
    mockFirstRunSetupError = "Credo unavailable";
    mockSessionWalletId = undefined;
    mockHolderAgent.status = "error";
    mockHolderAgent.error = "Credo unavailable";
    const screen = render(<OnboardingScreen />);

    fireEvent.press(screen.getByText("Skip"));
    fireEvent.press(screen.getByText("Try again"));
    await waitFor(() => expect(mockRetryFirstRunSetup).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByText("Back to PIN setup"));
    await waitFor(() => expect(mockResetFirstRunSetup).toHaveBeenCalledTimes(1));
    expect(router.replace).toHaveBeenCalledWith("/(auth)/set-pin");
  });

  it("opens Home when there is no pending flow", async () => {
    render(<ResumePendingFlowScreen />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/(wallet)/home"));
    expect(mockContinuePendingFlow).not.toHaveBeenCalled();
  });

  it("clears only a failed activation when continuing to the wallet", async () => {
    mockPendingActivationUrl = "unifywallet://activate?token=pending";
    mockContinuePendingFlow.mockResolvedValueOnce({
      ok: false,
      kind: "activation",
      error: "The activation service is unavailable.",
    } as never);
    const screen = render(<ResumePendingFlowScreen />);

    await waitFor(() => expect(screen.getByText("Could not resume this request")).toBeTruthy());
    fireEvent.press(screen.getByText("Continue to wallet"));

    await waitFor(() => expect(mockClearPendingFlow).toHaveBeenCalledWith("activation"));
    expect(router.replace).toHaveBeenCalledWith("/(wallet)/home");
  });
});
