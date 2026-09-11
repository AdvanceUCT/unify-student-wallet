import {
  clearPendingTopUp,
  loadPendingTopUp,
  parsePendingTopUp,
  PENDING_TOP_UP_STORAGE_KEY,
  savePendingTopUp,
} from "@/src/features/payment/topUpSession";
import { deleteSecureValue, getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

jest.mock("@/src/lib/storage/secureStore", () => ({
  deleteSecureValue: jest.fn(),
  getSecureValue: jest.fn(),
  saveSecureValue: jest.fn(),
}));

const pendingTopUp = {
  amountMinor: 4575,
  authorizationUrl: "https://checkout.paystack.test/pay/abc",
  createdAt: "2026-09-10T03:10:00.000Z",
  currency: "ZAR" as const,
  idempotencyKey: "topup-request-001",
  reference: "PSK_ref_001",
  status: "PENDING" as const,
  topUpId: "topup-001",
};

describe("top-up session storage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("persists one pending hosted checkout reference", async () => {
    await savePendingTopUp(pendingTopUp);

    expect(saveSecureValue).toHaveBeenCalledWith(
      PENDING_TOP_UP_STORAGE_KEY,
      JSON.stringify(pendingTopUp),
    );
  });

  it("loads a valid pending checkout", async () => {
    jest.mocked(getSecureValue).mockResolvedValueOnce(JSON.stringify(pendingTopUp));

    await expect(loadPendingTopUp()).resolves.toEqual(pendingTopUp);
    expect(deleteSecureValue).not.toHaveBeenCalled();
  });

  it("clears malformed pending checkout state", async () => {
    jest.mocked(getSecureValue).mockResolvedValueOnce(JSON.stringify({ ...pendingTopUp, topUpId: "" }));

    await expect(loadPendingTopUp()).resolves.toBeNull();
    expect(deleteSecureValue).toHaveBeenCalledWith(PENDING_TOP_UP_STORAGE_KEY);
  });

  it("rejects malformed state before saving", async () => {
    await expect(savePendingTopUp({ ...pendingTopUp, amountMinor: 0 })).rejects.toThrow("malformed");
    expect(saveSecureValue).not.toHaveBeenCalled();
  });

  it("parses unknown state as a non-terminal pending record", () => {
    expect(parsePendingTopUp(JSON.stringify({ ...pendingTopUp, status: "UNKNOWN" }))).toEqual({
      ...pendingTopUp,
      status: "UNKNOWN",
    });
  });

  it("clears the pending record", async () => {
    await clearPendingTopUp();

    expect(deleteSecureValue).toHaveBeenCalledWith(PENDING_TOP_UP_STORAGE_KEY);
  });
});
