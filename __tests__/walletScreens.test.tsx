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

const mockWalletSession = {
  activationSetup: {
    activationId: "activation-demo",
    activationSource: "token" as const,
    credentialRecordId: "credential-record-001",
    holderConnectionId: "connection-001",
    issuerLabel: "UNIFY Issuer Service",
    ledgerName: "BCovrin Test" as const,
    studentId: "student-demo-001",
    walletId: "wallet-demo-001",
  },
  biometricAvailable: true,
  biometricEnabled: false,
  confirmPinToDisableBiometric: jest.fn(),
  lockWallet: jest.fn(),
  session: {
    activationId: "activation-demo",
    activationSource: "token" as const,
    authStatus: "signedIn" as const,
    activationStatus: "activated" as const,
    credentialRecordId: "credential-record-001",
    holderConnectionId: "connection-001",
    lockStatus: "unlocked" as const,
    studentId: "student-demo-001",
    walletId: "wallet-demo-001",
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
  });

  it("shows wallet backend state on the home screen", () => {
    const screen = render(<HomeScreen />);

    expect(screen.getByText("Campus wallet control center")).toBeTruthy();
    expect(screen.getByText("wallet-demo-001")).toBeTruthy();
    expect(screen.getByText("credential-record-001")).toBeTruthy();
    expect(screen.getByText("Scan service QR")).toBeTruthy();
  });

  it("parses a demo verification QR and exposes the presentation action", () => {
    const screen = render(<ScanScreen />);

    fireEvent.press(screen.getByText("Use demo verification QR"));

    expect(screen.getByText("main-library")).toBeTruthy();
    expect(screen.getByText("Present credential")).toBeTruthy();

    fireEvent.press(screen.getByText("Present credential"));

    expect(screen.getByText("Credential presentation approved for main-library.")).toBeTruthy();
  });

  it("shows activation and holder-agent diagnostics in settings", () => {
    const screen = render(<SettingsScreen />);

    expect(screen.getByText("Activation and agent diagnostics")).toBeTruthy();
    expect(screen.getByText("UNIFY Issuer Service")).toBeTruthy();
    expect(screen.getByText("connection-001")).toBeTruthy();
  });
});
