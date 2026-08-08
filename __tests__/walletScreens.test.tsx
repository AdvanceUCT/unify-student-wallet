import { fireEvent, render, waitFor } from "@testing-library/react-native";

import HomeScreen from "@/app/(wallet)/home";
import ScanScreen from "@/app/(wallet)/scan";
import SettingsScreen from "@/app/(wallet)/settings";

const mockRequestPermission = jest.fn();
const mockUseQuery = jest.fn(({ queryKey }: { queryKey: string[] }) => {
  if (queryKey[0] === "stored-credentials") {
    return { data: [], isError: false, isLoading: false };
  }

  if (queryKey[0] === "wallet-summary") {
    return { data: null, isError: false, isLoading: false };
  }

  if (queryKey[0] === "payment-history") {
    return { data: [], isError: false, isLoading: false };
  }

  return { data: undefined, isError: false, isLoading: false };
});

const mockProcessIncomingLink = jest.fn().mockResolvedValue({ ok: true });
let mockHolderAgent = {
  error: undefined as string | undefined,
  resumeWallet: jest.fn(async () => null),
  status: "ready" as "idle" | "initializing" | "ready" | "error",
};

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
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(callback, [callback]);
  },
}));

jest.mock("@/src/features/wallet/WalletSessionProvider", () => ({
  useWalletSession: () => mockWalletSession,
}));

jest.mock("@/src/features/wallet/HolderAgentProvider", () => ({
  useHolderAgent: () => mockHolderAgent,
}));

describe("wallet screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWalletSession.pendingOfferIds = [];
    mockHolderAgent = { error: undefined, resumeWallet: jest.fn(async () => null), status: "ready" };
  });

  it("shows the wallet masthead on the home screen", () => {
    const screen = render(<HomeScreen />);

    expect(screen.getByText("Your identity")).toBeTruthy();
    expect(screen.getByText("Open scanner")).toBeTruthy();
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["stored-credentials", "wallet-uuid-001"] }),
    );
  });

  it("shows the pending offers card when offers are queued", () => {
    mockWalletSession.pendingOfferIds = ["offer-1", "offer-2"];

    const screen = render(<HomeScreen />);

    expect(screen.getByText("2 new credential offers")).toBeTruthy();
    expect(screen.getByText("Review what your institution issued")).toBeTruthy();
  });

  it("shows Home immediately with a credential placeholder while the agent resumes", () => {
    mockHolderAgent.status = "initializing";

    const screen = render(<HomeScreen />);

    expect(screen.getByText("Your identity")).toBeTruthy();
    expect(screen.getByLabelText("Loading credential")).toBeTruthy();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it("prompts the user to enable camera permission on the scan screen", () => {
    const screen = render(<ScanScreen />);

    expect(screen.getByText("Camera access needed")).toBeTruthy();
    fireEvent.press(screen.getByText("Allow camera"));
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it("shows the agent status and backup action in settings", async () => {
    const screen = render(<SettingsScreen />);

    expect(screen.getByText("Holder agent")).toBeTruthy();
    expect(screen.getByText("Sign out")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Create encrypted backup")).toBeTruthy());
  });
});
