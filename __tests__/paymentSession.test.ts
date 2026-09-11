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
const validSession = {
  accessToken: "opaque-token",
  accessExpiresAt: futureExpiry,
  refreshToken: "refresh-token",
  refreshExpiresAt: futureExpiry,
  sessionId: "session-1",
};

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
    await savePaymentSession({ ...validSession, sessionId: "session-1" });

    expect(saveSecureValue).toHaveBeenCalledWith(
      PAYMENT_SESSION_STORAGE_KEY,
      JSON.stringify({ ...validSession, sessionId: "session-1" }),
    );
    expect(PAYMENT_SESSION_STORAGE_KEY).not.toBe("unify.wallet.session.v1");
  });

  it("loads a valid native session", async () => {
    jest.mocked(getSecureValue).mockResolvedValueOnce(JSON.stringify(validSession));

    await expect(loadPaymentSession()).resolves.toEqual(validSession);
    expect(deleteSecureValue).not.toHaveBeenCalled();
  });

  it("keeps an expired access token while the refresh token is still valid", async () => {
    const expiredAccessSession = { ...validSession, accessExpiresAt: "2020-01-01T00:00:00.000Z" };
    jest.mocked(getSecureValue).mockResolvedValueOnce(JSON.stringify(expiredAccessSession));

    await expect(loadPaymentSession()).resolves.toEqual(expiredAccessSession);
    expect(deleteSecureValue).not.toHaveBeenCalled();
  });

  it.each([
    "not-json",
    JSON.stringify({ ...validSession, accessToken: "" }),
    JSON.stringify({ ...validSession, accessExpiresAt: "not-a-date" }),
    JSON.stringify({ ...validSession, refreshToken: "" }),
    JSON.stringify({ ...validSession, refreshExpiresAt: "2020-01-01T00:00:00.000Z" }),
  ])("clears invalid data or expired refresh credentials", async (storedValue) => {
    jest.mocked(getSecureValue).mockResolvedValueOnce(storedValue);

    await expect(loadPaymentSession()).resolves.toBeNull();
    expect(deleteSecureValue).toHaveBeenCalledWith(PAYMENT_SESSION_STORAGE_KEY);
  });

  it("rejects invalid sessions before writing them", async () => {
    await expect(savePaymentSession({ ...validSession, accessToken: " " })).rejects.toThrow("refresh expiry");
    expect(saveSecureValue).not.toHaveBeenCalled();
  });

  it("keeps web sessions in memory without using the localStorage-backed abstraction", async () => {
    setPlatform("web");
    const webSession = { ...validSession, accessToken: "web-token" };
    await savePaymentSession(webSession);

    await expect(loadPaymentSession()).resolves.toEqual(webSession);
    expect(saveSecureValue).not.toHaveBeenCalled();
    expect(getSecureValue).not.toHaveBeenCalled();

    await clearPaymentSession();
    await expect(loadPaymentSession()).resolves.toBeNull();
    expect(deleteSecureValue).not.toHaveBeenCalled();
  });

  it("parses using refresh expiry without treating access expiry as terminal", () => {
    expect(
      parsePaymentSession(
        JSON.stringify({
          accessToken: "token",
          accessExpiresAt: "2026-09-04T12:00:00.000Z",
          refreshToken: "refresh",
          refreshExpiresAt: "2026-09-05T12:00:00.000Z",
          sessionId: "session-1",
        }),
        Date.parse("2026-09-05T11:59:59.000Z"),
      ),
    ).toEqual({
      accessToken: "token",
      accessExpiresAt: "2026-09-04T12:00:00.000Z",
      refreshToken: "refresh",
      refreshExpiresAt: "2026-09-05T12:00:00.000Z",
      sessionId: "session-1",
    });
  });
});
