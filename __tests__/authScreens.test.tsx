import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import ActivationSuccessScreen from "@/app/(auth)/activation-success";
import ActivateScreen from "@/app/(auth)/activate";
import ChangePinScreen from "@/app/(auth)/change-pin";
import SetPinScreen from "@/app/(auth)/set-pin";
import SignInScreen from "@/app/(auth)/sign-in";
import UnlockScreen from "@/app/(auth)/unlock";
import WalletSetupScreen from "@/app/(auth)/wallet-setup";
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
  activationSetup?: {
    activationId: string;
    activationSource: "token" | "oob";
    credentialRecordId?: string;
    holderConnectionId?: string;
    issuerLabel: string;
    ledgerName: "BCovrin Test";
    studentId: string;
    walletId: string;
  };
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  changePin: jest.Mock;
  confirmPinToDisableBiometric: jest.Mock;
  continueMockSession: jest.Mock;
  failedAttempts: number;
  hasPin: boolean;
  isHardLocked: boolean;
  isHydrated: boolean;
  lockWallet: jest.Mock;
  prepareActivationFromLink: jest.Mock;
  session: WalletSession;
  setBiometricEnabled: jest.Mock;
  setPin: jest.Mock;
  signOut: jest.Mock;
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
    activationSetup: {
      activationId: "activation-demo",
      activationSource: "token",
      credentialRecordId: "credential-record-001",
      holderConnectionId: "connection-001",
      issuerLabel: "UNIFY Issuer Service",
      ledgerName: "BCovrin Test",
      studentId: "student-demo-001",
      walletId: "wallet-demo-001",
    },
    biometricAvailable: false,
    biometricEnabled: false,
    changePin: jest.fn().mockResolvedValue({ ok: true }),
    confirmPinToDisableBiometric: jest.fn().mockResolvedValue({ ok: true }),
    continueMockSession: jest.fn(),
    failedAttempts: 0,
    hasPin: false,
    isHardLocked: false,
    isHydrated: true,
    lockWallet: jest.fn(),
    prepareActivationFromLink: jest.fn().mockResolvedValue({ ok: true }),
    session: {
      activationId: "activation-demo",
      activationSource: "token",
      authStatus: "signedIn",
      activationStatus: "activated",
      credentialRecordId: "credential-record-001",
      holderConnectionId: "connection-001",
      lockStatus: "locked",
      studentId: "student-demo-001",
      walletId: "wallet-demo-001",
    },
    setBiometricEnabled: jest.fn().mockResolvedValue({ ok: true }),
    setPin: jest.fn().mockResolvedValue({ ok: true }),
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

  it("continues the mock session from sign-in", () => {
    const screen = render(<SignInScreen />);

    fireEvent.press(screen.getByText("Create your student wallet"));

    expect(mockWalletSession.continueMockSession).toHaveBeenCalledTimes(1);
  });

  it("prompts students to create the holder wallet before activation", () => {
    mockWalletSession.hasPin = false;
    mockWalletSession.session = {
      authStatus: "signedIn",
      activationStatus: "notActivated",
      lockStatus: "locked",
      studentId: "student-demo-001",
    };
    mockHolderAgent = { status: "idle" };

    const screen = render(<WalletSetupScreen />);

    expect(screen.getByText("Create your student wallet")).toBeTruthy();
    expect(screen.getByText("Create secure wallet")).toBeTruthy();
    expect(screen.getByText("Activation link required")).toBeTruthy();
  });

  it("waits for an activation link when no token is open", () => {
    const screen = render(<ActivateScreen />);

    expect(screen.getByText("Waiting for link")).toBeTruthy();
    expect(screen.getByText("No activation link is open in this session.")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Activation code")).toBeNull();
  });

  it("submits an activation link from route params", async () => {
    mockSearchParams = { token: "demo-token" };
    render(<ActivateScreen />);

    await waitFor(() =>
      expect(mockWalletSession.prepareActivationFromLink).toHaveBeenCalledWith("unifywallet://activate?token=demo-token"),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/(auth)/activation-success"));
  });

  it("shows activation success before first PIN setup", () => {
    mockWalletSession.hasPin = false;
    mockWalletSession.session = {
      authStatus: "signedIn",
      activationStatus: "activationPending",
      lockStatus: "locked",
      studentId: "student-demo-001",
      walletId: "wallet-demo-001",
    };

    const screen = render(<ActivationSuccessScreen />);

    expect(screen.getByText("Activation link accepted")).toBeTruthy();
    expect(screen.getByText("Create wallet PIN")).toBeTruthy();
    expect(screen.getByText("UNIFY Issuer Service")).toBeTruthy();
  });

  it("shows credential storage success after activation completes", () => {
    mockWalletSession.hasPin = true;

    const screen = render(<ActivationSuccessScreen />);

    expect(screen.getByText("Credential stored")).toBeTruthy();
    expect(screen.getByText("Unlock wallet")).toBeTruthy();
    expect(screen.getByText("credential-record-001")).toBeTruthy();
  });

  it("submits matching PIN entries via keypad in two steps", async () => {
    const screen = render(<SetPinScreen />);

    expect(screen.getByText("Set your PIN")).toBeTruthy();

    // Step 1 — enter PIN
    pressDigits(screen, ["1", "2", "3", "4", "5", "6"]);

    // Confirm step appears after auto-advance
    await waitFor(() => expect(screen.getByText("Confirm your PIN")).toBeTruthy());

    // Step 2 — confirm PIN
    pressDigits(screen, ["1", "2", "3", "4", "5", "6"]);

    await waitFor(() => expect(mockWalletSession.setPin).toHaveBeenCalledWith("123456", "123456"));
  });

  it("submits matching 4-digit PIN entries via the keypad submit action", async () => {
    const screen = render(<SetPinScreen />);

    pressDigits(screen, ["1", "3", "5", "7"]);
    fireEvent.press(screen.getByLabelText("Submit PIN"));

    await waitFor(() => expect(screen.getByText("Confirm your PIN")).toBeTruthy());

    pressDigits(screen, ["1", "3", "5", "7"]);
    fireEvent.press(screen.getByLabelText("Submit PIN"));

    await waitFor(() => expect(mockWalletSession.setPin).toHaveBeenCalledWith("1357", "1357"));
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

    expect(screen.getByText("Wallet locked")).toBeTruthy();
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

    expect(screen.getByText("Enter current PIN")).toBeTruthy();

    // Step 1: any valid 6-digit current PIN
    pressDigits(screen, ["1", "2", "3", "4", "5", "6"]);

    // Step 2 appears
    await waitFor(() => expect(screen.getByText("Enter new PIN")).toBeTruthy());

    // Step 2: non-weak 6-digit PIN
    pressDigits(screen, ["2", "4", "6", "8", "1", "3"]);

    // Step 3 appears
    await waitFor(() => expect(screen.getByText("Confirm new PIN")).toBeTruthy());

    // Step 3: confirmation matches step 2
    pressDigits(screen, ["2", "4", "6", "8", "1", "3"]);

    await waitFor(() =>
      expect(mockWalletSession.changePin).toHaveBeenCalledWith("123456", "246813", "246813"),
    );
  });

  it("supports changing to a 4-digit PIN via explicit submit", async () => {
    const screen = render(<ChangePinScreen />);

    pressDigits(screen, ["1", "3", "5", "7"]);
    fireEvent.press(screen.getByLabelText("Submit PIN"));
    await waitFor(() => expect(screen.getByText("Enter new PIN")).toBeTruthy());

    pressDigits(screen, ["2", "5", "8", "0"]);
    fireEvent.press(screen.getByLabelText("Submit PIN"));
    await waitFor(() => expect(screen.getByText("Confirm new PIN")).toBeTruthy());

    pressDigits(screen, ["2", "5", "8", "0"]);
    fireEvent.press(screen.getByLabelText("Submit PIN"));

    await waitFor(() => expect(mockWalletSession.changePin).toHaveBeenCalledWith("1357", "2580", "2580"));
  });

  it("rejects a weak new PIN at step 2 and stays on that step", async () => {
    const screen = render(<ChangePinScreen />);

    // Step 1
    pressDigits(screen, ["1", "2", "3", "4", "5", "6"]);
    await waitFor(() => expect(screen.getByText("Enter new PIN")).toBeTruthy());

    // Step 2: enter a sequential (weak) PIN
    pressDigits(screen, ["9", "8", "7", "6", "5", "4"]);

    // Should not advance to step 3
    await waitFor(() => expect(screen.queryByText("Confirm new PIN")).toBeNull());
    expect(screen.getByText("Enter new PIN")).toBeTruthy();
  });

  it("returns to step 1 when the current PIN is wrong", async () => {
    mockWalletSession.changePin = jest.fn().mockResolvedValue({
      ok: false,
      error: "Incorrect current PIN. 2 attempts remaining.",
    });

    const screen = render(<ChangePinScreen />);

    pressDigits(screen, ["1", "2", "3", "4", "5", "6"]);
    await waitFor(() => expect(screen.getByText("Enter new PIN")).toBeTruthy());
    pressDigits(screen, ["2", "4", "6", "8", "1", "3"]);
    await waitFor(() => expect(screen.getByText("Confirm new PIN")).toBeTruthy());
    pressDigits(screen, ["2", "4", "6", "8", "1", "3"]);

    await waitFor(() => expect(screen.getByText("Enter current PIN")).toBeTruthy());
  });

  it("shows the locked-out screen after too many change-PIN attempts", async () => {
    mockWalletSession.changePin = jest.fn().mockResolvedValue({
      ok: false,
      error: "Too many failed attempts. Sign out and sign back in to reset.",
    });

    const screen = render(<ChangePinScreen />);

    pressDigits(screen, ["1", "2", "3", "4", "5", "6"]);
    await waitFor(() => expect(screen.getByText("Enter new PIN")).toBeTruthy());
    pressDigits(screen, ["2", "4", "6", "8", "1", "3"]);
    await waitFor(() => expect(screen.getByText("Confirm new PIN")).toBeTruthy());
    pressDigits(screen, ["2", "4", "6", "8", "1", "3"]);

    await waitFor(() => expect(screen.getByText("Too many attempts")).toBeTruthy());
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
