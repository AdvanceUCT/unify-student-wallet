import {
  getVerificationResult,
  pollVerificationResult,
  startVerificationSession,
  type VerificationStatus,
} from "@/src/lib/api/verification";
import { apiClient } from "@/src/lib/api/apiClient";

jest.mock("@/src/lib/api/apiClient", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

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
});
