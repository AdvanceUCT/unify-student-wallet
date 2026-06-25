import { submitServiceVerification } from "@/src/lib/api/verification";

jest.mock("@/src/lib/api/apiClient", () => ({
  apiClient: { post: jest.fn() },
}));

import { apiClient } from "@/src/lib/api/apiClient";

const verificationPayload = {
  type: "verification" as const,
  vendorId: "vendor-001",
  servicePointId: "main-library",
  nonce: "proof-request-nonce",
};

describe("submitServiceVerification", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the credential when verification is approved", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      status: "ok",
      data: {
        approved: true,
        credential: {
          studentName: "Thando Nkosi",
          faculty: "Faculty of Science",
          validUntil: "2026-12-31",
        },
      },
    });

    const result = await submitServiceVerification(verificationPayload, "wallet-123");

    expect(apiClient.post).toHaveBeenCalledWith("/api/wallet/verification/submit", {
      vendorId: "vendor-001",
      servicePointId: "main-library",
      nonce: "proof-request-nonce",
      walletId: "wallet-123",
      type: "verification",
    });
    expect(result).toEqual({
      approved: true,
      credential: {
        studentName: "Thando Nkosi",
        faculty: "Faculty of Science",
        validUntil: "2026-12-31",
      },
    });
  });

  it("returns the decline reason when verification is rejected", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      status: "ok",
      data: { approved: false, reason: "credential_expired" },
    });

    const result = await submitServiceVerification(verificationPayload, "wallet-123");

    expect(result).toEqual({ approved: false, reason: "credential_expired" });
  });

  it("surfaces a service error as a decline reason", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      status: "error",
      error: "credential_not_found",
    });

    const result = await submitServiceVerification(verificationPayload, "wallet-123");

    expect(result).toEqual({
      approved: false,
      reason: "credential_not_found",
    });
  });
});
