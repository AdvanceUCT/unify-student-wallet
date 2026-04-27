import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ActivateScreen from "@/app/(auth)/activate";
import SetPinScreen from "@/app/(auth)/set-pin";
import SignInScreen from "@/app/(auth)/sign-in";
import UnlockScreen from "@/app/(auth)/unlock";
import type { WalletSession } from "@/src/features/wallet/sessionTypes";

let mockWalletSession: {
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  continueMockSession: jest.Mock;
  hasPin: boolean;
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
let mockSearchParams: { oob?: string | string[]; token?: string | string[] } = {};

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock("@/src/features/wallet/WalletSessionProvider", () => ({
  useWalletSession: () => mockWalletSession,
}));

function createMockWalletSession() {
  mockWalletSession = {
    biometricAvailable: false,
    biometricEnabled: false,
    continueMockSession: jest.fn(),
    hasPin: false,
    isHydrated: true,
    lockWallet: jest.fn(),
    prepareActivationFromLink: jest.fn().mockResolvedValue({ ok: true }),
    session: {
      authStatus: "signedIn",
      activationStatus: "activated",
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

describe("auth screens", () => {
  beforeEach(() => {
    createMockWalletSession();
    mockSearchParams = {};
  });

  it("continues the mock session from sign-in", () => {
    const screen = render(<SignInScreen />);

    fireEvent.press(screen.getByText("Continue"));

    expect(mockWalletSession.continueMockSession).toHaveBeenCalledTimes(1);
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
  });

  it("submits matching PIN entries", async () => {
    const screen = render(<SetPinScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("PIN"), "1234");
    fireEvent.changeText(screen.getByPlaceholderText("Confirm PIN"), "1234");
    fireEvent.press(screen.getByText("Save PIN"));

    await waitFor(() => expect(mockWalletSession.setPin).toHaveBeenCalledWith("1234", "1234"));
  });

  it("submits PIN unlock attempts", async () => {
    const screen = render(<UnlockScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("PIN"), "1234");
    fireEvent.press(screen.getByText("Unlock with PIN"));

    await waitFor(() => expect(mockWalletSession.unlockWithPin).toHaveBeenCalledWith("1234"));
  });
});
