import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { VerificationFlowScreen } from "@/src/features/verification/VerificationFlowScreen";
import { ApiClientError } from "@/src/lib/api/apiClient";
import {
  pollVerificationResult,
  startVerificationSession,
} from "@/src/lib/api/verification";

const mockAcceptVerificationProof = jest.fn(async () => undefined);
const mockReceiveVerificationProofRequest = jest.fn(async (_invitationUrl: string, _signal?: AbortSignal) => ({
  id: "proof-001",
}));
const mockRecordVerificationHistory = jest.fn(async () => undefined);
const mockSetPendingCheckoutVerification = jest.fn(async () => undefined);
const mockSetPendingVerificationPublicServicePointId = jest.fn(async () => undefined);
const mockSelectVerificationCredentials = jest.fn(async (_proofRecordId: string, _requestedAttributes: string[]) => ({
  proofRecordId: "proof-001",
  proofFormats: { anoncreds: { attributes: {} } },
  values: {
    firstName: "Lerato",
    studentNumber: "STU-12345",
  },
}));

const startResult = {
  verificationRequestId: "verification-001",
  invitationUrl: "https://agent.example.test?oob=proof-invitation",
  resultToken: "wallet-result-token",
  vendorName: "Campus Clinic",
  servicePointName: "Main desk",
  requestedAttributes: ["firstName", "studentNumber"],
  expiresAt: "2026-06-23T10:05:00.000Z",
};

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "client-request-001"),
}));

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
}));

jest.mock("@/src/features/wallet/WalletSessionProvider", () => ({
  useWalletSession: () => ({
    recordVerificationHistory: mockRecordVerificationHistory,
    session: {
      authStatus: "signedIn",
      lockStatus: "unlocked",
      pendingOfferIds: [],
      walletId: "wallet-uuid-001",
    },
    setPendingCheckoutVerification: mockSetPendingCheckoutVerification,
    setPendingVerificationPublicServicePointId: mockSetPendingVerificationPublicServicePointId,
  }),
}));

jest.mock("@/src/features/wallet/holderAgent", () => ({
  acceptVerificationProof: () => mockAcceptVerificationProof(),
  receiveVerificationProofRequest: (invitationUrl: string, signal?: AbortSignal) =>
    mockReceiveVerificationProofRequest(invitationUrl, signal),
  selectVerificationCredentials: (proofRecordId: string, requestedAttributes: string[]) =>
    mockSelectVerificationCredentials(proofRecordId, requestedAttributes),
}));

jest.mock("@/src/lib/api/verification", () => {
  const actual = jest.requireActual("@/src/lib/api/verification");
  return {
    ...actual,
    pollVerificationResult: jest.fn(),
    startVerificationSession: jest.fn(),
  };
});

describe("verification flow history", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (startVerificationSession as jest.Mock).mockResolvedValue(startResult);
    (pollVerificationResult as jest.Mock).mockResolvedValue({
      status: "Approved",
      expiresAt: "2026-06-23T10:05:00.000Z",
      completedAt: "2026-06-23T10:01:00.000Z",
    });
  });

  it("records an approved verification after the credential is presented", async () => {
    const screen = render(
      <VerificationFlowScreen target={{ kind: "servicePoint", publicServicePointId: "sp-public-001" }} />,
    );

    await waitFor(() => expect(screen.getByText("Present credential")).toBeTruthy());
    fireEvent.press(screen.getByText("Present credential"));

    await waitFor(() =>
      expect(mockRecordVerificationHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationRequestId: "verification-001",
          kind: "servicePoint",
          vendorName: "Campus Clinic",
          servicePointName: "Main desk",
          status: "Approved",
          expiresAt: "2026-06-23T10:05:00.000Z",
          completedAt: "2026-06-23T10:01:00.000Z",
          recordedAt: expect.any(String),
        }),
      ),
    );
  });

  it.each(["Declined", "Failed"] as const)("records a %s verification outcome", async (status) => {
    (pollVerificationResult as jest.Mock).mockResolvedValueOnce({
      status,
      failureCode: "CREDENTIAL_NOT_CURRENT",
      expiresAt: "2026-06-23T10:05:00.000Z",
      completedAt: "2026-06-23T10:01:00.000Z",
    });

    const screen = render(
      <VerificationFlowScreen target={{ kind: "servicePoint", publicServicePointId: "sp-public-001" }} />,
    );

    await waitFor(() => expect(screen.getByText("Present credential")).toBeTruthy());
    fireEvent.press(screen.getByText("Present credential"));

    await waitFor(() =>
      expect(mockRecordVerificationHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          status,
          failureCode: "CREDENTIAL_NOT_CURRENT",
        }),
      ),
    );
  });

  it("records an expired verification when the result capability has expired", async () => {
    (pollVerificationResult as jest.Mock).mockRejectedValueOnce(
      new ApiClientError("Expired", "http", 410),
    );

    const screen = render(
      <VerificationFlowScreen target={{ kind: "servicePoint", publicServicePointId: "sp-public-001" }} />,
    );

    await waitFor(() => expect(screen.getByText("Present credential")).toBeTruthy());
    fireEvent.press(screen.getByText("Present credential"));

    await waitFor(() =>
      expect(mockRecordVerificationHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationRequestId: "verification-001",
          status: "Expired",
          expiresAt: "2026-06-23T10:05:00.000Z",
          recordedAt: expect.any(String),
        }),
      ),
    );
  });

  it("does not record history before the student presents the credential", async () => {
    const screen = render(
      <VerificationFlowScreen target={{ kind: "servicePoint", publicServicePointId: "sp-public-001" }} />,
    );

    await waitFor(() => expect(screen.getByText("Present credential")).toBeTruthy());

    expect(mockRecordVerificationHistory).not.toHaveBeenCalled();
  });
});
