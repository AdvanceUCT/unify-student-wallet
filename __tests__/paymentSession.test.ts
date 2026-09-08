import { Platform } from "react-native";

import {
  clearPaymentSession,
  loadPaymentSession,
  parsePaymentSession,
  PAYMENT_SESSION_STORAGE_KEY,
  savePaymentSession,
} from "@/src/features/payment/paymentSession";
import { deleteSecureValue, getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

jest.mock("@/src/lib/storage/secureStore", () => ({
  deleteSecureValue: jest.fn(),
  getSecureValue: jest.fn(),
  saveSecureValue: jest.fn(),
}));

const originalPlatform = Platform.OS;
const futureExpiry = "2099-01-01T00:00:00.000Z";

function setPlatform(platform: typeof Platform.OS) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: platform });
}

describe("payment session storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform("ios");
  });

  afterAll(() => setPlatform(originalPlatform));

  it("persists a valid native session under a payment-specific key", async () => {
    await savePaymentSession({ accessToken: "opaque-token", expiresAt: futureExpiry, sessionId: "session-1" });

    expect(saveSecureValue).toHaveBeenCalledWith(
      PAYMENT_SESSION_STORAGE_KEY,
      JSON.stringify({ accessToken: "opaque-token", expiresAt: futureExpiry, sessionId: "session-1" }),
    );
    expect(PAYMENT_SESSION_STORAGE_KEY).not.toBe("unify.wallet.session.v1");
  });

  it("loads a valid native session", async () => {
    jest.mocked(getSecureValue).mockResolvedValueOnce(
      JSON.stringify({ accessToken: "opaque-token", expiresAt: futureExpiry }),
    );

    await expect(loadPaymentSession()).resolves.toEqual({ accessToken: "opaque-token", expiresAt: futureExpiry });
    expect(deleteSecureValue).not.toHaveBeenCalled();
  });

  it.each([
    "not-json",
    JSON.stringify({ accessToken: "", expiresAt: futureExpiry }),
    JSON.stringify({ accessToken: "opaque-token", expiresAt: "not-a-date" }),
    JSON.stringify({ accessToken: "opaque-token", expiresAt: "2020-01-01T00:00:00.000Z" }),
  ])("clears invalid or expired persisted data", async (storedValue) => {
    jest.mocked(getSecureValue).mockResolvedValueOnce(storedValue);

    await expect(loadPaymentSession()).resolves.toBeNull();
    expect(deleteSecureValue).toHaveBeenCalledWith(PAYMENT_SESSION_STORAGE_KEY);
  });

  it("rejects invalid sessions before writing them", async () => {
    await expect(
      savePaymentSession({ accessToken: " ", expiresAt: futureExpiry }),
    ).rejects.toThrow("future expiry time");
    expect(saveSecureValue).not.toHaveBeenCalled();
  });

  it("keeps web sessions in memory without using the localStorage-backed abstraction", async () => {
    setPlatform("web");
    await savePaymentSession({ accessToken: "web-token", expiresAt: futureExpiry });

    await expect(loadPaymentSession()).resolves.toEqual({ accessToken: "web-token", expiresAt: futureExpiry });
    expect(saveSecureValue).not.toHaveBeenCalled();
    expect(getSecureValue).not.toHaveBeenCalled();

    await clearPaymentSession();
    await expect(loadPaymentSession()).resolves.toBeNull();
    expect(deleteSecureValue).not.toHaveBeenCalled();
  });

  it("parses using an explicit clock without exposing the token elsewhere", () => {
    expect(
      parsePaymentSession(
        JSON.stringify({ accessToken: "token", expiresAt: "2026-09-04T12:00:00.000Z" }),
        Date.parse("2026-09-04T11:59:59.000Z"),
      ),
    ).toEqual({ accessToken: "token", expiresAt: "2026-09-04T12:00:00.000Z" });
  });
});

