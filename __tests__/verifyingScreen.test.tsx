import { render, waitFor } from "@testing-library/react-native";

import VerifyingScreen from "@/app/(wallet)/verifying";

const mockReplace = jest.fn();
const mockParams = {
  verificationRequestId: "req-1",
  resultToken: "token-1",
  expiresAt: new Date(Date.now() + 5000).toISOString(),
  vendorId: "vendor-001",
  servicePointId: "main-library",
};

jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
  useLocalSearchParams: () => mockParams,
}));

const mockPollVerificationResult = jest.fn();

jest.mock("@/src/lib/api/verification", () => {
  class VerificationPollAbortedError extends Error {}
  return {
    pollVerificationResult: (...args: unknown[]) => mockPollVerificationResult(...args),
    VerificationPollAbortedError,
  };
});

import { VerificationPollAbortedError } from "@/src/lib/api/verification";

describe("VerifyingScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.expiresAt = new Date(Date.now() + 5000).toISOString();
  });

  it("routes to the result screen when verification is approved", async () => {
    mockPollVerificationResult.mockResolvedValueOnce({
      status: "Approved",
      expiresAt: mockParams.expiresAt,
      credential: {
        studentName: "Thando Nkosi",
        faculty: "Faculty of Science",
        validUntil: "2026-12-31",
      },
    });

    render(<VerifyingScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());

    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/(wallet)/verification-result",
        params: expect.objectContaining({
          studentName: "Thando Nkosi",
          faculty: "Faculty of Science",
          validUntil: "2026-12-31",
          vendorId: "vendor-001",
          servicePointId: "main-library",
        }),
      }),
    );
  });

  it("routes to the failure screen when verification is declined", async () => {
    mockPollVerificationResult.mockResolvedValueOnce({
      status: "Declined",
      expiresAt: mockParams.expiresAt,
      reason: "credential_revoked",
    });

    render(<VerifyingScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(wallet)/verification-failed",
      params: { reason: "credential_revoked", vendorId: "vendor-001", servicePointId: "main-library" },
    });
  });

  it("treats a session timeout as expired once the expiry deadline passes", async () => {
    jest.useFakeTimers();
    mockParams.expiresAt = new Date(Date.now() + 1000).toISOString();

    mockPollVerificationResult.mockImplementationOnce(
      (_id: string, _token: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => reject(new VerificationPollAbortedError()));
        }),
    );

    render(<VerifyingScreen />);

    await jest.advanceTimersByTimeAsync(1500);

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(wallet)/verification-failed",
      params: { reason: "session_expired", vendorId: "vendor-001", servicePointId: "main-library" },
    });

    jest.useRealTimers();
  });
});
