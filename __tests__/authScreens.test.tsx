import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import ActivateScreen from "@/app/(auth)/activate";
import ChangePinScreen from "@/app/(auth)/change-pin";
import SetPinScreen from "@/app/(auth)/set-pin";
import SignInScreen from "@/app/(auth)/sign-in";
import UnlockScreen from "@/app/(auth)/unlock";
import SettingsScreen from "@/app/(wallet)/settings";
import type { WalletSession } from "@/src/features/wallet/sessionTypes";

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success", Error: "error" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => `hash:${value}`),
  randomUUID: jest.fn(() => "test-salt"),
}));

let mockWalletSession: {
  acceptOffer: jest.Mock;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  changePin: jest.Mock;
  confirmPinToDisableBiometric: jest.Mock;
  createWallet: jest.Mock;
  declineOffer: jest.Mock;
  failedAttempts: number;
  hasPin: boolean;
  isHardLocked: boolean;
  isHydrated: boolean;
  lockWallet: jest.Mock;
  pendingOfferIds: string[];
  processIncomingLink: jest.Mock;
  session: WalletSession;
  setBiometricEnabled: jest.Mock;
  signOut: jest.Mock;
  stashedActivationUrl?: string;
  unlockWithBiometric: jest.Mock;
  unlockWithPin: jest.Mock;
};
let mockHolderAgent: {
  error?: string;
  status: "idle" | "initializing" | "ready" | "error";
};
let mockSearchParams: { oob?: string | string[]; token?: string | string[] } = {};

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(callback, [callback]);
  },
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock("@/src/features/wallet/WalletSessionProvider", () => ({
  useWalletSession: () => mockWalletSession,
}));

jest.mock("@/src/features/wallet/HolderAgentProvider", () => ({
  useHolderAgent: () => mockHolderAgent,
}));

function createMockWalletSession() {
  mockWalletSession = {
    acceptOffer: jest.fn().mockResolvedValue({ ok: true }),
    biometricAvailable: false,
    biometricEnabled: false,
    changePin: jest.fn().mockResolvedValue({ ok: true }),
    confirmPinToDisableBiometric: jest.fn().mockResolvedValue({ ok: true }),
    createWallet: jest.fn().mockResolvedValue({ ok: true }),
    declineOffer: jest.fn().mockResolvedValue({ ok: true }),
    failedAttempts: 0,
    hasPin: false,
    isHardLocked: false,
    isHydrated: true,
    lockWallet: jest.fn(),
    pendingOfferIds: [],
    processIncomingLink: jest.fn().mockResolvedValue({ ok: true }),
    session: {
      authStatus: "signedIn",
      lockStatus: "unlocked",
      pendingOfferIds: [],
      walletId: "wallet-uuid-001",
    },
    setBiometricEnabled: jest.fn().mockResolvedValue({ ok: true }),
    signOut: jest.fn(),
    unlockWithBiometric: jest.fn().mockResolvedValue({ ok: true }),
    unlockWithPin: jest.fn().mockResolvedValue({ ok: true }),
  };
}

function pressDigits(screen: ReturnType<typeof render>, digits: string[]) {
  for (const digit of digits) {
    fireEvent.press(screen.getByLabelText(digit));
  }
}

describe("auth screens", () => {
  beforeEach(() => {
    createMockWalletSession();
    mockHolderAgent = { status: "ready" };
    mockSearchParams = {};
    jest.clearAllMocks();
  });

  it("routes to PIN setup from the welcome screen", () => {
    const screen = render(<SignInScreen />);

    fireEvent.press(screen.getByText("Create wallet"));

    expect(router.push).toHaveBeenCalledWith("/(auth)/set-pin");
  });

  it("waits for an activation link when no token is open", () => {
    const screen = render(<ActivateScreen />);

    expect(
      screen.getByText("Open the activation link from your university to receive your credential."),
    ).toBeTruthy();
  });

  it("processes an activation link from route params", async () => {
    mockSearchParams = { token: "demo-token" };
    render(<ActivateScreen />);

    await waitFor(() =>
      expect(mockWalletSession.processIncomingLink).toHaveBeenCalledWith("unifywallet://activate?token=demo-token"),
    );
  });

  it("submits matching PIN entries via keypad in two steps", async () => {
    const screen = render(<SetPinScreen />);

    expect(screen.getByText("Choose a PIN.")).toBeTruthy();

    pressDigits(screen, ["1", "2", "3", "4", "5", "6"]);

    await waitFor(() => expect(screen.getByText("Re-enter the PIN.")).toBeTruthy());

    pressDigits(screen, ["1", "2", "3", "4", "5", "6"]);

    await waitFor(() => expect(mockWalletSession.createWallet).toHaveBeenCalledWith("123456", "123456"));
  });

  it("submits matching 4-digit PIN entries via the keypad submit action", async () => {
    const screen = render(<SetPinScreen />);

    pressDigits(screen, ["1", "3", "5", "7"]);
    fireEvent.press(screen.getByLabelText("Submit PIN"));

    await waitFor(() => expect(screen.getByText("Re-enter the PIN.")).toBeTruthy());

    pressDigits(screen, ["1", "3", "5", "7"]);
    fireEvent.press(screen.getByLabelText("Submit PIN"));

    await waitFor(() => expect(mockWalletSession.createWallet).toHaveBeenCalledWith("1357", "1357"));
  });

  it("submits PIN unlock attempts via keypad", async () => {
    const screen = render(<UnlockScreen />);

    pressDigits(screen, ["1", "2", "3", "4", "5", "6"]);

    await waitFor(() => expect(mockWalletSession.unlockWithPin).toHaveBeenCalledWith("123456"));
  });

  it("submits 4-digit PIN unlock attempts via the keypad submit action", async () => {
    const screen = render(<UnlockScreen />);

    pressDigits(screen, ["1", "3", "5", "7"]);
    fireEvent.press(screen.getByLabelText("Submit PIN"));

    await waitFor(() => expect(mockWalletSession.unlockWithPin).toHaveBeenCalledWith("1357"));
  });

  it("shows the hard-locked screen when wallet is locked out", () => {
    mockWalletSession.isHardLocked = true;
    mockWalletSession.failedAttempts = 5;

    const screen = render(<UnlockScreen />);

    expect(screen.getByText("Wallet locked.")).toBeTruthy();
    expect(screen.getByText("Sign out")).toBeTruthy();
  });

  it("calls signOut from the hard-locked screen", () => {
    mockWalletSession.isHardLocked = true;
    mockWalletSession.failedAttempts = 5;

    const screen = render(<UnlockScreen />);
    fireEvent.press(screen.getByText("Sign out"));

    expect(mockWalletSession.signOut).toHaveBeenCalledTimes(1);
  });

  it("advances through all three change-PIN steps and calls changePin", async () => {
    const screen = render(<ChangePinScreen />);

    expect(screen.getByText("Current PIN.")).toBeTruthy();

    pressDigits(screen, ["1", "2", "3", "4", "5", "6"]);

    await waitFor(() => expect(screen.getByText("Choose a new PIN.")).toBeTruthy());

    pressDigits(screen, ["2", "4", "6", "8", "1", "3"]);

    await waitFor(() => expect(screen.getByText("Re-enter new PIN.")).toBeTruthy());

    pressDigits(screen, ["2", "4", "6", "8", "1", "3"]);

    await waitFor(() =>
      expect(mockWalletSession.changePin).toHaveBeenCalledWith("123456", "246813", "246813"),
    );
  });

  it("supports changing to a 4-digit PIN via explicit submit", async () => {
    const screen = render(<ChangePinScreen />);

    pressDigits(screen, ["1", "3", "5", "7"]);
    fireEvent.press(screen.getByLabelText("Submit PIN"));
    await waitFor(() => expect(screen.getByText("Choose a new PIN.")).toBeTruthy());

    pressDigits(screen, ["2", "5", "8", "0"]);
    fireEvent.press(screen.getByLabelText("Submit PIN"));
    await waitFor(() => expect(screen.getByText("Re-enter new PIN.")).toBeTruthy());

    pressDigits(screen, ["2", "5", "8", "0"]);
    fireEvent.press(screen.getByLabelText("Submit PIN"));

    await waitFor(() => expect(mockWalletSession.changePin).toHaveBeenCalledWith("1357", "2580", "2580"));
  });

  it("rejects a weak new PIN at step 2 and stays on that step", async () => {
    const screen = render(<ChangePinScreen />);

    pressDigits(screen, ["1", "2", "3", "4", "5", "6"]);
    await waitFor(() => expect(screen.getByText("Choose a new PIN.")).toBeTruthy());

    pressDigits(screen, ["9", "8", "7", "6", "5", "4"]);

    await waitFor(() => expect(screen.queryByText("Re-enter new PIN.")).toBeNull());
    expect(screen.getByText("Choose a new PIN.")).toBeTruthy();
  });

  it("returns to step 1 when the current PIN is wrong", async () => {
    mockWalletSession.changePin = jest.fn().mockResolvedValue({
      ok: false,
      error: "Incorrect current PIN. 2 attempts remaining.",
    });

    const screen = render(<ChangePinScreen />);

    pressDigits(screen, ["1", "2", "3", "4", "5", "6"]);
    await waitFor(() => expect(screen.getByText("Choose a new PIN.")).toBeTruthy());
    pressDigits(screen, ["2", "4", "6", "8", "1", "3"]);
    await waitFor(() => expect(screen.getByText("Re-enter new PIN.")).toBeTruthy());
    pressDigits(screen, ["2", "4", "6", "8", "1", "3"]);

    await waitFor(() => expect(screen.getByText("Current PIN.")).toBeTruthy());
  });

  it("shows the locked-out screen after too many change-PIN attempts", async () => {
    mockWalletSession.changePin = jest.fn().mockResolvedValue({
      ok: false,
      error: "Too many failed attempts. Sign out and sign back in to reset.",
    });

    const screen = render(<ChangePinScreen />);

    pressDigits(screen, ["1", "2", "3", "4", "5", "6"]);
    await waitFor(() => expect(screen.getByText("Choose a new PIN.")).toBeTruthy());
    pressDigits(screen, ["2", "4", "6", "8", "1", "3"]);
    await waitFor(() => expect(screen.getByText("Re-enter new PIN.")).toBeTruthy());
    pressDigits(screen, ["2", "4", "6", "8", "1", "3"]);

    await waitFor(() => expect(screen.getByText("Too many attempts.")).toBeTruthy());
  });

  it("requires PIN confirmation before disabling biometric unlock", async () => {
    mockWalletSession.biometricAvailable = true;
    mockWalletSession.biometricEnabled = true;
    mockWalletSession.setBiometricEnabled = jest.fn().mockResolvedValue({
      ok: false,
      error: "PIN required to disable biometric unlock.",
      requiresPin: true,
    });

    const screen = render(<SettingsScreen />);

    fireEvent(screen.getByLabelText("Toggle biometric unlock"), "valueChange", false);

    await waitFor(() => expect(screen.getByText("Enter your PIN")).toBeTruthy());

    pressDigits(screen, ["1", "3", "5", "7"]);
    fireEvent.press(screen.getByLabelText("Submit PIN"));

    await waitFor(() => expect(mockWalletSession.confirmPinToDisableBiometric).toHaveBeenCalledWith("1357"));
  });
});
