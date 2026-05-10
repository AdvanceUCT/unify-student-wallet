import { fireEvent, render } from "@testing-library/react-native";

import HomeScreen from "@/app/(wallet)/home";
import ScanScreen from "@/app/(wallet)/scan";
import SettingsScreen from "@/app/(wallet)/settings";
import { mockPaymentHistory, mockStudentCredential, mockWalletSummary } from "@/src/lib/api/mockStudent";

const mockRequestPermission = jest.fn();
const mockUseQuery = jest.fn(({ queryKey }: { queryKey: string[] }) => {
  if (queryKey[0] === "student-credential") {
    return { data: mockStudentCredential, isError: false, isLoading: false };
  }

  if (queryKey[0] === "wallet-summary") {
    return { data: mockWalletSummary, isError: false, isLoading: false };
  }

  if (queryKey[0] === "payment-history") {
    return { data: mockPaymentHistory, isError: false, isLoading: false };
  }

  return { data: undefined, isError: false, isLoading: false };
});

const mockProcessIncomingLink = jest.fn().mockResolvedValue({ ok: true });

const mockWalletSession = {
  acceptOffer: jest.fn().mockResolvedValue({ ok: true }),
  biometricAvailable: true,
  biometricEnabled: false,
  confirmPinToDisableBiometric: jest.fn(),
  declineOffer: jest.fn().mockResolvedValue({ ok: true }),
  lockWallet: jest.fn(),
  pendingOfferIds: [] as string[],
  processIncomingLink: mockProcessIncomingLink,
  session: {
    authStatus: "signedIn" as const,
    lockStatus: "unlocked" as const,
    pendingOfferIds: [] as string[],
    walletId: "wallet-uuid-001",
  },
  setBiometricEnabled: jest.fn().mockResolvedValue({ ok: true }),
  signOut: jest.fn(),
};

jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: string[] }) => mockUseQuery(options),
}));

jest.mock("expo-camera", () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: false }, mockRequestPermission],
}));

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  router: { push: jest.fn() },
}));

jest.mock("@/src/features/wallet/WalletSessionProvider", () => ({
  useWalletSession: () => mockWalletSession,
}));

jest.mock("@/src/features/wallet/HolderAgentProvider", () => ({
  useHolderAgent: () => ({ status: "ready" }),
}));

describe("wallet screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWalletSession.pendingOfferIds = [];
  });

  it("shows wallet diagnostics on the home screen", () => {
    const screen = render(<HomeScreen />);

    expect(screen.getByText("Campus wallet control center")).toBeTruthy();
    expect(screen.getByText("wallet-uuid-001")).toBeTruthy();
    expect(screen.getByText("Scan service QR")).toBeTruthy();
  });

  it("shows the pending offers banner when offers are queued", () => {
    mockWalletSession.pendingOfferIds = ["offer-1", "offer-2"];

    const screen = render(<HomeScreen />);

    expect(screen.getByText("You have 2 pending credential offers.")).toBeTruthy();
    expect(screen.getByText("Review offers")).toBeTruthy();
  });

  it("parses a demo verification QR and exposes the presentation action", async () => {
    const screen = render(<ScanScreen />);

    fireEvent.press(screen.getByText("Use demo verification QR"));

    expect(await screen.findByText("main-library")).toBeTruthy();
    expect(screen.getByText("Present credential")).toBeTruthy();

    fireEvent.press(screen.getByText("Present credential"));

    expect(screen.getByText("Credential presentation approved for main-library.")).toBeTruthy();
  });

  it("shows the wallet status in settings", () => {
    const screen = render(<SettingsScreen />);

    expect(screen.getByText("Holder agent")).toBeTruthy();
    expect(screen.getByText("wallet-uuid-001")).toBeTruthy();
  });
});
