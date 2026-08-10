import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { VerificationFlowScreen } from "@/src/features/verification/VerificationFlowScreen";
import { WalletVerificationError } from "@/src/features/verification/verificationErrors";
import { ApiClientError } from "@/src/lib/api/apiClient";

const mockEnsureWalletReady = jest.fn();
const mockClaimCheckoutSession = jest.fn();
const mockStartVerificationSession = jest.fn();
const mockReceiveProof = jest.fn();
const mockSelectCredentials = jest.fn();
const mockAcceptProof = jest.fn();
const mockSetPendingCheckout = jest.fn(async () => undefined);
const mockSetPendingServicePoint = jest.fn(async () => undefined);
const mockClearPendingFlow = jest.fn(async () => undefined);
const mockAddActivity = jest.fn(async (_record?: unknown) => undefined);
const mockPollResult = jest.fn();
const mockReplace = jest.fn();

const claimedSession = {
  verificationRequestId: "verification-001",
  invitationUrl: "https://agent.example/oob/verification-001",
  resultToken: "result-capability",
  vendorName: "Campus Store",
  servicePointName: "Main Branch",
  requestedAttributes: ["studentNumber"],
  expiresAt: "2026-08-08T12:05:00.000Z",
};

let mockPendingCheckout: {
  verificationRequestId: string;
  claimToken: string;
  claimedSession?: typeof claimedSession;
} | undefined;

jest.mock("expo-crypto", () => ({ randomUUID: () => "client-request-001" }));
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Medium: "medium" },
}));
jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: (...args: unknown[]) => mockReplace(...args) },
  Stack: { Screen: () => null },
}));
jest.mock("@/src/components/AppScreen", () => ({
  AppScreen: ({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) => {
    const { View } = require("react-native");
    return <View>{children}{footer}</View>;
  },
}));
jest.mock("@/src/components/ScreenHeader", () => ({
  ScreenHeader: ({ title }: { title: string }) => {
    const { Text } = require("react-native");
    return <Text>{title}</Text>;
  },
}));
jest.mock("@/src/components/OperationStateScreen", () => ({
  OperationStateScreen: ({ detail, message, primaryAction, secondaryAction, title }: {
    detail?: string;
    message: string;
    primaryAction?: { label: string; onPress: () => void };
    secondaryAction?: { label: string; onPress: () => void };
    title: string;
  }) => {
    const { Text, TouchableOpacity, View } = require("react-native");
    return (
      <View>
        <Text>{title}</Text><Text>{message}</Text>{detail ? <Text>{detail}</Text> : null}
        {primaryAction ? <TouchableOpacity onPress={primaryAction.onPress}><Text>{primaryAction.label}</Text></TouchableOpacity> : null}
        {secondaryAction ? <TouchableOpacity onPress={secondaryAction.onPress}><Text>{secondaryAction.label}</Text></TouchableOpacity> : null}
      </View>
    );
  },
}));
jest.mock("@/src/components/VerificationConsentPanel", () => ({
  VerificationConsentPanel: () => {
    const { Text } = require("react-native");
    return <Text>Requested values</Text>;
  },
}));
jest.mock("@/src/features/wallet/HolderAgentProvider", () => ({
  useHolderAgent: () => ({ ensureWalletReady: mockEnsureWalletReady }),
}));
jest.mock("@/src/features/wallet/WalletSessionProvider", () => ({
  useWalletSession: () => ({
    clearPendingFlow: mockClearPendingFlow,
    pendingCheckoutVerification: mockPendingCheckout,
    session: { authStatus: "signedIn", lockStatus: "unlocked", pendingOfferIds: [], walletId: "wallet-001" },
    setPendingCheckoutVerification: mockSetPendingCheckout,
    setPendingVerificationPublicServicePointId: mockSetPendingServicePoint,
  }),
}));
jest.mock("@/src/features/wallet/holderAgentRuntime", () => ({
  acceptVerificationProofLazy: (...args: unknown[]) => mockAcceptProof(...args),
  receiveVerificationProofRequestLazy: (...args: unknown[]) => mockReceiveProof(...args),
  selectVerificationCredentialsLazy: (...args: unknown[]) => mockSelectCredentials(...args),
}));
jest.mock("@/src/features/verification/activityHistory", () => ({
  addVerificationActivity: (record: unknown) => mockAddActivity(record),
}));
jest.mock("@/src/lib/api/verification", () => ({
  ApiClientError: class extends Error {},
  claimCheckoutVerificationSession: (...args: unknown[]) => mockClaimCheckoutSession(...args),
  pollVerificationResult: (...args: unknown[]) => mockPollResult(...args),
  startVerificationSession: (...args: unknown[]) => mockStartVerificationSession(...args),
  verificationFailureMessage: jest.fn(() => "Verification failed"),
  verificationRequestErrorMessage: jest.fn(() => "Verification could not be completed"),
}));

describe("checkout verification readiness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPendingCheckout = {
      verificationRequestId: "verification-001",
      claimToken: "single-use-claim-token",
    };
    mockClaimCheckoutSession.mockResolvedValue(claimedSession);
    mockReceiveProof.mockResolvedValue({ id: "proof-001" });
    mockSelectCredentials.mockResolvedValue({
      proofRecordId: "proof-001",
      proofFormats: { anoncreds: {} },
      values: { studentNumber: "STU001" },
    });
    mockPollResult.mockResolvedValue({
      status: "Approved",
      expiresAt: claimedSession.expiresAt,
      completedAt: "2026-08-08T12:01:00.000Z",
    });
  });

  it("does not consume the checkout claim until the holder wallet is ready", async () => {
    let resolveReady!: () => void;
    mockEnsureWalletReady.mockReturnValueOnce(new Promise<void>((resolve) => { resolveReady = resolve; }));

    const screen = render(
      <VerificationFlowScreen target={{ kind: "checkout", verificationRequestId: "verification-001", claimToken: "single-use-claim-token" }} />,
    );

    await waitFor(() => expect(mockEnsureWalletReady).toHaveBeenCalledWith("wallet-001"));
    expect(mockClaimCheckoutSession).not.toHaveBeenCalled();

    resolveReady();
    await waitFor(() => expect(screen.getByText("Review before sharing")).toBeTruthy());
    expect(mockClaimCheckoutSession).toHaveBeenCalledTimes(1);
    expect(mockSetPendingCheckout).toHaveBeenCalledWith({
      verificationRequestId: "verification-001",
      claimToken: "single-use-claim-token",
      claimedSession,
    });
  });

  it("reuses a securely stored claimed session instead of claiming again", async () => {
    mockEnsureWalletReady.mockResolvedValue(null);
    mockPendingCheckout = {
      verificationRequestId: "verification-001",
      claimToken: "single-use-claim-token",
      claimedSession,
    };

    const screen = render(
      <VerificationFlowScreen target={{ kind: "checkout", verificationRequestId: "verification-001", claimToken: "single-use-claim-token" }} />,
    );

    await waitFor(() => expect(screen.getByText("Review before sharing")).toBeTruthy());
    expect(mockClaimCheckoutSession).not.toHaveBeenCalled();
    expect(mockReceiveProof).toHaveBeenCalledWith(claimedSession.invitationUrl, expect.anything());
  });

  it("reports preparation stages at the actual request and credential boundaries", async () => {
    let resolveProof!: (proof: { id: string }) => void;
    let resolveSelection!: (selection: { proofRecordId: string; proofFormats: { anoncreds: object }; values: { studentNumber: string } }) => void;
    mockEnsureWalletReady.mockResolvedValue(null);
    mockPendingCheckout = { verificationRequestId: "verification-001", claimToken: "single-use-claim-token", claimedSession };
    mockReceiveProof.mockReturnValueOnce(new Promise((resolve) => { resolveProof = resolve; }));
    mockSelectCredentials.mockReturnValueOnce(new Promise((resolve) => { resolveSelection = resolve; }));

    const screen = render(
      <VerificationFlowScreen target={{ kind: "checkout", verificationRequestId: "verification-001", claimToken: "single-use-claim-token" }} />,
    );

    await waitFor(() => expect(screen.getByText("Receiving request")).toBeTruthy());
    resolveProof({ id: "proof-001" });
    await waitFor(() => expect(screen.getByText("Matching credential")).toBeTruthy());
    resolveSelection({ proofRecordId: "proof-001", proofFormats: { anoncreds: {} }, values: { studentNumber: "STU001" } });
    await waitFor(() => expect(screen.getByText("Review before sharing")).toBeTruthy());
  });

  it("clears the local pending flow when the student chooses Not now", async () => {
    mockEnsureWalletReady.mockResolvedValue(null);
    mockPendingCheckout = {
      verificationRequestId: "verification-001",
      claimToken: "single-use-claim-token",
      claimedSession,
    };

    const screen = render(
      <VerificationFlowScreen target={{ kind: "checkout", verificationRequestId: "verification-001", claimToken: "single-use-claim-token" }} />,
    );
    await waitFor(() => expect(screen.getByText("Not now")).toBeTruthy());
    fireEvent.press(screen.getByText("Not now"));

    await waitFor(() => expect(mockClearPendingFlow).toHaveBeenCalledWith("checkout"));
    expect(mockReplace).toHaveBeenCalledWith("/(wallet)/home");
    expect(mockAddActivity).not.toHaveBeenCalled();
  });

  it("shows a terminal revoked screen without presenting credential values", async () => {
    mockEnsureWalletReady.mockResolvedValue(null);
    mockPendingCheckout = { verificationRequestId: "verification-001", claimToken: "single-use-claim-token", claimedSession };
    mockSelectCredentials.mockRejectedValueOnce(
      new WalletVerificationError("CREDENTIAL_REVOKED", "Credential revoked", "proof-001"),
    );

    const screen = render(
      <VerificationFlowScreen target={{ kind: "checkout", verificationRequestId: "verification-001", claimToken: "single-use-claim-token" }} />,
    );

    await waitFor(() => expect(screen.getByText("Credential revoked")).toBeTruthy());
    expect(mockAcceptProof).not.toHaveBeenCalled();
    expect(mockClearPendingFlow).toHaveBeenCalledWith("checkout");
    expect(mockAddActivity).toHaveBeenCalledWith(expect.objectContaining({
      failureCode: "CREDENTIAL_NOT_CURRENT",
      disclosedValues: [],
      status: "Declined",
    }));
  });

  it("labels a network failure before sharing and confirms nothing was disclosed", async () => {
    mockEnsureWalletReady.mockResolvedValue(null);
    mockClaimCheckoutSession.mockRejectedValueOnce(new ApiClientError("Network unavailable", "network"));

    const screen = render(
      <VerificationFlowScreen target={{ kind: "checkout", verificationRequestId: "verification-001", claimToken: "single-use-claim-token" }} />,
    );

    await waitFor(() => expect(screen.getByText("Connection lost")).toBeTruthy());
    expect(screen.getByText("No credential information was shared.")).toBeTruthy();
  });

  it("checks an existing result after connectivity is lost post-share", async () => {
    mockEnsureWalletReady.mockResolvedValue(null);
    mockPendingCheckout = { verificationRequestId: "verification-001", claimToken: "single-use-claim-token", claimedSession };
    mockPollResult.mockRejectedValueOnce(new ApiClientError("Network unavailable", "network"));

    const screen = render(
      <VerificationFlowScreen target={{ kind: "checkout", verificationRequestId: "verification-001", claimToken: "single-use-claim-token" }} />,
    );
    await waitFor(() => expect(screen.getByText("Present credential")).toBeTruthy());
    fireEvent.press(screen.getByText("Present credential"));

    await waitFor(() => expect(screen.getByText("Result connection lost")).toBeTruthy());
    mockPollResult.mockResolvedValueOnce({ status: "Approved", expiresAt: claimedSession.expiresAt });
    fireEvent.press(screen.getByText("Check result"));

    await waitFor(() => expect(screen.getByText("Credential verified")).toBeTruthy());
    expect(mockAcceptProof).toHaveBeenCalledTimes(1);
    expect(mockPollResult).toHaveBeenCalledTimes(2);
  });

  it.each(["Approved", "Declined", "Failed"] as const)("records a terminal %s result once", async (status) => {
    mockEnsureWalletReady.mockResolvedValue(null);
    mockPendingCheckout = { verificationRequestId: "verification-001", claimToken: "single-use-claim-token", claimedSession };
    mockPollResult.mockResolvedValueOnce({
      status,
      ...(status === "Approved" ? {} : { failureCode: "CREDENTIAL_NOT_CURRENT" }),
      expiresAt: claimedSession.expiresAt,
      completedAt: "2026-08-08T12:01:00.000Z",
    });

    const screen = render(
      <VerificationFlowScreen target={{ kind: "checkout", verificationRequestId: "verification-001", claimToken: "single-use-claim-token" }} />,
    );
    await waitFor(() => expect(screen.getByText("Present credential")).toBeTruthy());
    fireEvent.press(screen.getByText("Present credential"));

    await waitFor(() => expect(mockAddActivity).toHaveBeenCalledWith(expect.objectContaining({
      id: "verification-001",
      proofExchangeId: "proof-001",
      status,
      disclosedValues: [{ name: "Student number", value: "STU001" }],
    })));
    expect(mockAddActivity).toHaveBeenCalledTimes(1);
  });

  it("records an expired result when the result capability has expired", async () => {
    mockEnsureWalletReady.mockResolvedValue(null);
    mockPendingCheckout = { verificationRequestId: "verification-001", claimToken: "single-use-claim-token", claimedSession };
    mockPollResult.mockRejectedValueOnce(new ApiClientError("Expired", "http", 410));

    const screen = render(
      <VerificationFlowScreen target={{ kind: "checkout", verificationRequestId: "verification-001", claimToken: "single-use-claim-token" }} />,
    );
    await waitFor(() => expect(screen.getByText("Present credential")).toBeTruthy());
    fireEvent.press(screen.getByText("Present credential"));

    await waitFor(() => expect(mockAddActivity).toHaveBeenCalledWith(expect.objectContaining({ status: "Expired" })));
    expect(screen.getByText("Expired")).toBeTruthy();
  });

  it("keeps the authoritative result when local activity persistence fails", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockEnsureWalletReady.mockResolvedValue(null);
    mockPendingCheckout = { verificationRequestId: "verification-001", claimToken: "single-use-claim-token", claimedSession };
    mockAddActivity.mockRejectedValueOnce(new Error("Secure storage unavailable"));

    const screen = render(
      <VerificationFlowScreen target={{ kind: "checkout", verificationRequestId: "verification-001", claimToken: "single-use-claim-token" }} />,
    );
    await waitFor(() => expect(screen.getByText("Present credential")).toBeTruthy());
    fireEvent.press(screen.getByText("Present credential"));

    await waitFor(() => expect(screen.getByText("Credential verified")).toBeTruthy());
    expect(consoleError).toHaveBeenCalledWith(
      "[verification-activity] Unable to save verification result.",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it("distinguishes an interrupted cancellation from a request failure", async () => {
    mockEnsureWalletReady.mockResolvedValue(null);
    mockClaimCheckoutSession.mockRejectedValueOnce(new ApiClientError("Request cancelled", "cancelled"));

    const screen = render(
      <VerificationFlowScreen target={{ kind: "checkout", verificationRequestId: "verification-001", claimToken: "single-use-claim-token" }} />,
    );

    await waitFor(() => expect(screen.getByText("Verification was interrupted")).toBeTruthy());
  });

  it("shows registry outages separately from revoked credentials", async () => {
    mockEnsureWalletReady.mockResolvedValue(null);
    mockPendingCheckout = { verificationRequestId: "verification-001", claimToken: "single-use-claim-token", claimedSession };
    mockPollResult.mockResolvedValueOnce({
      status: "Failed",
      failureCode: "REVOCATION_CHECK_FAILED",
      expiresAt: claimedSession.expiresAt,
    });

    const screen = render(
      <VerificationFlowScreen target={{ kind: "checkout", verificationRequestId: "verification-001", claimToken: "single-use-claim-token" }} />,
    );
    await waitFor(() => expect(screen.getByText("Present credential")).toBeTruthy());
    fireEvent.press(screen.getByText("Present credential"));

    await waitFor(() => expect(screen.getByText("Credential status could not be confirmed")).toBeTruthy());
  });
});
