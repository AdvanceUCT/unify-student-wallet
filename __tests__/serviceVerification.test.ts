import {
  claimCheckoutVerificationSession,
  getVerificationResult,
  pollVerificationResult,
  startVerificationSession,
  verificationFailureMessage,
  verificationRequestErrorMessage,
  type VerificationStatus,
} from "@/src/lib/api/verification";
import { ApiClientError, apiClient } from "@/src/lib/api/apiClient";

jest.mock("@/src/lib/api/apiClient", () => {
  const actual = jest.requireActual("@/src/lib/api/apiClient");
  return { ...actual, apiClient: { get: jest.fn(), post: jest.fn() } };
});

describe("wallet verification API", () => {
  afterEach(() => jest.clearAllMocks());

  it("starts a session with the public service point and stable client request ID", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ verificationRequestId: "verification-001" });

    await startVerificationSession("sp-public-001", "client-request-001");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/wallet/verification/sessions",
      { publicServicePointId: "sp-public-001", clientRequestId: "client-request-001" },
      { signal: undefined, timeoutMs: 10_000 },
    );
  });

  it("claims a checkout session through its single-use public endpoint", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ verificationRequestId: "verification-001" });

    await claimCheckoutVerificationSession("verification/001", "claim-token");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/wallet/verification/sessions/verification%2F001/claim",
      { claimToken: "claim-token" },
      { signal: undefined, timeoutMs: 10_000 },
    );
  });

  it("uses the capability token only for the matching result endpoint", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ status: "Pending" });

    await getVerificationResult("verification/001", "result-token");

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/wallet/verification/sessions/verification%2F001",
      { resultToken: "result-token", signal: undefined, timeoutMs: 10_000 },
    );
  });

  it.each<VerificationStatus>(["Approved", "Declined", "Expired", "Failed"])(
    "returns the authoritative %s result",
    async (status) => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        status,
        expiresAt: "2026-06-23T10:05:00.000Z",
      });

      await expect(pollVerificationResult("verification-001", "result-token")).resolves.toMatchObject({ status });
    },
  );

  it("explains a non-current credential without exposing an internal code", () => {
    expect(verificationFailureMessage("CREDENTIAL_NOT_CURRENT")).toBe(
      "This credential is suspended, revoked, or no longer current.",
    );
  });

  it("maps known request failures to specific safe guidance", () => {
    const error = new ApiClientError(
      "Session record verification-001 was already claimed by wallet-123.",
      "http",
      409,
      "VERIFICATION_SESSION_REUSED",
    );

    expect(verificationRequestErrorMessage(error)).toBe(
      "This checkout verification link has already been used.",
    );
  });

  it("does not expose unknown backend error messages", () => {
    const error = new ApiClientError("Database constraint verification_sessions_nonce_key failed.", "http", 500);

    expect(verificationRequestErrorMessage(error)).toBe(
      "Verification could not be completed. Try again or request a new verification link.",
    );
  });
});
