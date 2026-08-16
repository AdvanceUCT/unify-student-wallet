import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import HomeScreen from "@/app/(wallet)/home";
import ActivityScreen from "@/app/(wallet)/activity";
import InboxScreen from "@/app/(wallet)/inbox";
import OffersScreen from "@/app/(wallet)/offers";
import ScanScreen from "@/app/(wallet)/scan";
import SettingsScreen from "@/app/(wallet)/settings";

const mockRequestPermission = jest.fn();
const mockSetThemePreference = jest.fn(async () => undefined);
let mockCameraGranted = false;
let mockRecentActivity: Array<{
  id: string;
  walletId: string;
  proofExchangeId: string;
  verifierName: string;
  servicePointName: string;
  status: "Approved" | "Declined" | "Expired" | "Failed";
  disclosedValues: Array<{ name: string; value: string }>;
  occurredAt: string;
}> = [];
let mockStoredCredentials: Array<{
  id: string;
  state?: string;
  credentialAttributes?: Array<{ name: string; value: string }>;
}> = [];
let mockPendingOffers: Array<{
  id: string;
  credentialAttributes?: Array<{ name: string; value: string }>;
}> = [];
const mockUseQuery = jest.fn(({ queryKey, enabled = true }: { queryKey: string[]; enabled?: boolean }) => {
  if (queryKey[0] === "stored-credentials") {
    const data = !enabled && mockStoredCredentials.length === 0 ? undefined : mockStoredCredentials;
    return { data, isError: false, isLoading: enabled && data === undefined };
  }

  if (queryKey[0] === "wallet-summary") {
    return { data: null, isError: false, isLoading: false };
  }

  if (queryKey[0] === "payment-history") {
    return { data: [], isError: false, isLoading: false };
  }

  if (queryKey[0] === "pending-offers") {
    return { data: mockPendingOffers, isError: false, isLoading: false };
  }

  return { data: undefined, isError: false, isLoading: false };
});

const mockProcessIncomingLink = jest.fn().mockResolvedValue({ ok: true });
let mockHolderAgent = {
  ensureWalletReady: jest.fn(async () => null),
  error: undefined as string | undefined,
  preloadRuntime: jest.fn(async () => undefined),
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
  CameraView: (props: Record<string, unknown>) => {
    const { View } = require("react-native");
    return <View testID="camera-view" {...props} />;
  },
  useCameraPermissions: () => [{ granted: mockCameraGranted }, mockRequestPermission],
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
  NotificationFeedbackType: { Warning: "warning" },
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

jest.mock("@/src/features/theme/ThemePreferenceProvider", () => ({
  useThemePalette: () => require("@/src/theme/colors").lightColors,
  useThemePreference: () => ({ colors: require("@/src/theme/colors").lightColors, preference: "system", resolvedScheme: "light", setPreference: mockSetThemePreference }),
}));

jest.mock("@/src/features/verification/activityHistory", () => ({
  getVerificationActivity: jest.fn(async () => mockRecentActivity),
}));

describe("wallet screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWalletSession.pendingOfferIds = [];
    mockCameraGranted = false;
    mockRecentActivity = [];
    mockStoredCredentials = [];
    mockPendingOffers = [];
    mockHolderAgent = {
      ensureWalletReady: jest.fn(async () => null),
      error: undefined,
      preloadRuntime: jest.fn(async () => undefined),
      resumeWallet: jest.fn(async () => null),
      status: "ready",
    };
  });

  it("shows the wallet masthead on the home screen", () => {
    const screen = render(<HomeScreen />);

    expect(screen.getByText("Your identity")).toBeTruthy();
    expect(screen.queryByText("UNIFY student wallet")).toBeNull();
    expect(screen.queryByText("Wallet ready")).toBeNull();
    expect(screen.queryByLabelText("Open settings")).toBeNull();
    expect(screen.getByText("Scan to receive")).toBeTruthy();
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["stored-credentials", "wallet-uuid-001"] }),
    );
  });

  it("shows the pending offers card when offers are queued", () => {
    mockWalletSession.pendingOfferIds = ["offer-1", "offer-2"];

    const screen = render(<HomeScreen />);

    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("Credential offers ready")).toBeTruthy();
  });

  it("shows the credential skeleton while the first credential is being accepted", async () => {
    let completeAcceptance!: (result: { ok: true }) => void;
    mockWalletSession.pendingOfferIds = ["offer-1"];
    mockPendingOffers = [{
      id: "offer-1",
      credentialAttributes: [
        { name: "institution", value: "University of Cape Town" },
        { name: "programme", value: "Computer Science" },
      ],
    }];
    mockWalletSession.acceptOffer.mockImplementationOnce(
      () => new Promise((resolve) => { completeAcceptance = resolve; }),
    );

    const screen = render(<OffersScreen />);
    fireEvent.press(screen.getByText("Accept"));

    expect(screen.getByText("Adding credential")).toBeTruthy();
    expect(screen.getByLabelText("Loading credential")).toBeTruthy();

    await act(async () => completeAcceptance({ ok: true }));
  });

  it("shows at most three recent presentations on Home", async () => {
    mockRecentActivity = ["Library", "Bookshop", "Cafeteria", "Gym"].map((verifierName, index) => ({
      id: `activity-${index}`,
      walletId: "wallet-uuid-001",
      proofExchangeId: `proof-${index}`,
      verifierName,
      servicePointName: "Main branch",
      status: "Approved" as const,
      disclosedValues: [],
      occurredAt: `2026-08-0${8 - index}T12:00:00.000Z`,
    }));

    const screen = render(<HomeScreen />);

    await waitFor(() => expect(screen.getByText("Library")).toBeTruthy());
    expect(screen.getByText("Bookshop")).toBeTruthy();
    expect(screen.getByText("Cafeteria")).toBeTruthy();
    expect(screen.queryByText("Gym")).toBeNull();
  });

  it("keeps the issued credential compact and makes verification the primary action", () => {
    mockStoredCredentials = [{
      id: "credential-active",
      state: "done",
      credentialAttributes: [
        { name: "institution", value: "University of Cape Town" },
        { name: "firstName", value: "Alex" },
        { name: "lastName", value: "Student" },
        { name: "studentNumber", value: "STD-2026" },
        { name: "programme", value: "Computer Science" },
        { name: "issuedAt", value: "2026-01-01T00:00:00.000Z" },
        { name: "expiresAt", value: "2027-01-01T00:00:00.000Z" },
      ],
    }];

    const screen = render(<HomeScreen />);
    fireEvent(screen.getByTestId("credential-carousel"), "layout", { nativeEvent: { layout: { width: 312 } } });

    expect(screen.getByText("Scan to verify")).toBeTruthy();
    expect(screen.getByText("Alex Student")).toBeTruthy();
    expect(screen.queryByText("Computer Science")).toBeNull();
    expect(screen.queryByText("2026-01-01")).toBeNull();
    expect(screen.queryByText("VERIFIABLE STUDENT IDENTITY")).toBeNull();
  });

  it("uses Inbox for credential offers and validity warnings", () => {
    mockWalletSession.pendingOfferIds = ["offer-1"];
    mockStoredCredentials = [{
      id: "credential-expired",
      state: "done",
      credentialAttributes: [{ name: "expiresAt", value: "2020-01-01T00:00:00.000Z" }],
    }];

    const screen = render(<InboxScreen />);

    expect(screen.getByText("Inbox")).toBeTruthy();
    expect(screen.getByText("1 credential offer")).toBeTruthy();
    expect(screen.getByText("Credential expired")).toBeTruthy();
    expect(screen.getByText("2 items need attention")).toBeTruthy();
  });

  it("shows an all-caught-up Inbox when there are no actions", () => {
    const screen = render(<InboxScreen />);

    expect(screen.getByText("Nothing needs your attention")).toBeTruthy();
    expect(screen.getByText("No action needed")).toBeTruthy();
  });

  it("shows Home immediately with a credential placeholder while the agent resumes", () => {
    mockHolderAgent.status = "initializing";

    const screen = render(<HomeScreen />);

    expect(screen.getByText("Your identity")).toBeTruthy();
    expect(screen.getByLabelText("Loading credential")).toBeTruthy();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it("preserves the credential stage while the agent transitions from loading to ready", () => {
    mockHolderAgent.status = "initializing";
    const screen = render(<HomeScreen />);
    const loadingHeight = StyleSheet.flatten(screen.getByTestId("home-credential-stage").props.style).minHeight;

    mockHolderAgent.status = "ready";
    mockStoredCredentials = [{
      id: "credential-after-resume",
      state: "done",
      credentialAttributes: [
        { name: "institution", value: "University of Cape Town" },
        { name: "firstName", value: "Caleb" },
        { name: "lastName", value: "Voskuil" },
        { name: "studentNumber", value: "VOSCAL099" },
        { name: "expiresAt", value: "2027-08-08T00:00:00.000Z" },
      ],
    }];
    screen.rerender(<HomeScreen />);
    fireEvent(screen.getByTestId("credential-carousel"), "layout", { nativeEvent: { layout: { width: 312 } } });

    const readyHeight = StyleSheet.flatten(screen.getByTestId("home-credential-stage").props.style).minHeight;
    expect(readyHeight).toBe(loadingHeight);
    expect(screen.getByText("Caleb Voskuil")).toBeTruthy();
    expect(screen.getByText("Scan to verify")).toBeTruthy();
  });

  it("keeps a cached credential visible while the holder agent resumes", () => {
    mockHolderAgent.status = "initializing";
    mockStoredCredentials = [{
      id: "credential-cached",
      credentialAttributes: [
        { name: "firstName", value: "Cached" },
        { name: "lastName", value: "Student" },
        { name: "studentNumber", value: "CACHE-001" },
      ],
    }];

    const screen = render(<HomeScreen />);
    fireEvent(screen.getByTestId("credential-carousel"), "layout", { nativeEvent: { layout: { width: 312 } } });

    expect(screen.getByText("Cached Student")).toBeTruthy();
    expect(screen.queryByLabelText("Loading credential")).toBeNull();
    expect(screen.queryByText("Scan to verify")).toBeNull();
  });

  it("shows the full verification activity list", async () => {
    mockRecentActivity = [{
      id: "verification-001",
      walletId: "wallet-uuid-001",
      proofExchangeId: "proof-001",
      verifierName: "Campus Store",
      servicePointName: "Online checkout",
      status: "Declined",
      disclosedValues: [{ name: "Faculty", value: "Science" }],
      occurredAt: "2026-06-23T10:01:00.000Z",
    }];
    const screen = render(<ActivityScreen />);

    await waitFor(() => expect(screen.getByText("Campus Store")).toBeTruthy());
    expect(screen.getByText("Audit trail")).toBeTruthy();
    expect(screen.getByText("Online checkout")).toBeTruthy();
    expect(screen.getByText("Declined")).toBeTruthy();
  });

  it("shows the empty activity state", async () => {
    const screen = render(<ActivityScreen />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("No presentations yet")).toBeTruthy();
    expect(screen.getByText("Your activity is private.")).toBeTruthy();
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

  it("locks a valid QR capture and navigates only once", async () => {
    mockCameraGranted = true;
    const routerMock = jest.requireMock("expo-router").router as { push: jest.Mock };
    const screen = render(<ScanScreen />);
    const camera = screen.getByTestId("camera-view");

    fireEvent(camera, "barcodeScanned", { data: "https://voskuils.com/verify/sp-public-001" });
    fireEvent(camera, "barcodeScanned", { data: "https://voskuils.com/verify/sp-public-001" });
    expect(screen.getByText("Code captured")).toBeTruthy();

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledTimes(1));
  });

  it("changes the persisted appearance preference from settings", async () => {
    const screen = render(<SettingsScreen />);

    await waitFor(() => expect(screen.getByText("Create encrypted backup")).toBeTruthy());
    fireEvent.press(screen.getByText("Dark"));
    expect(mockSetThemePreference).toHaveBeenCalledWith("dark");
  });
});
