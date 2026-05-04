import { hashPin, validateNewPin, validatePin, validatePinConfirmation, verifyPin } from "@/src/features/wallet/pin";

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: {
    SHA256: "SHA-256",
  },
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => `hash:${value}`),
  randomUUID: jest.fn(() => "test-salt"),
}));

describe("wallet PIN helpers", () => {
  it("accepts 4 to 6 digit PINs", () => {
    expect(validatePin("1234")).toEqual({ ok: true });
    expect(validatePin("123456")).toEqual({ ok: true });
  });

  it("rejects invalid PIN shapes", () => {
    expect(validatePin("123")).toEqual({ ok: false, error: "Use a 4 to 6 digit PIN." });
    expect(validatePin("abcdef")).toEqual({ ok: false, error: "Use a 4 to 6 digit PIN." });
    expect(validatePin("1234567")).toEqual({ ok: false, error: "Use a 4 to 6 digit PIN." });
  });

  it("requires confirmation to match", () => {
    expect(validatePinConfirmation("1234", "4321")).toEqual({ ok: false, error: "PIN entries do not match." });
  });

  it("hashes and verifies a PIN with a salt", async () => {
    const hash = await hashPin("1234", "demo-salt");

    await expect(verifyPin("1234", "demo-salt", hash)).resolves.toBe(true);
    await expect(verifyPin("4321", "demo-salt", hash)).resolves.toBe(false);
  });

  it("validateNewPin accepts a strong PIN", () => {
    expect(validateNewPin("246813")).toEqual({ ok: true });
    expect(validateNewPin("9517")).toEqual({ ok: true });
  });

  it("validateNewPin rejects all-same-digit PINs", () => {
    expect(validateNewPin("1111")).toEqual({ ok: false, error: expect.stringContaining("too easy to guess") });
    expect(validateNewPin("000000")).toEqual({ ok: false, error: expect.stringContaining("too easy to guess") });
  });

  it("validateNewPin rejects ascending sequential PINs", () => {
    expect(validateNewPin("1234")).toEqual({ ok: false, error: expect.stringContaining("too easy to guess") });
    expect(validateNewPin("123456")).toEqual({ ok: false, error: expect.stringContaining("too easy to guess") });
    expect(validateNewPin("3456")).toEqual({ ok: false, error: expect.stringContaining("too easy to guess") });
  });

  it("validateNewPin rejects descending sequential PINs", () => {
    expect(validateNewPin("9876")).toEqual({ ok: false, error: expect.stringContaining("too easy to guess") });
    expect(validateNewPin("987654")).toEqual({ ok: false, error: expect.stringContaining("too easy to guess") });
  });

  it("validateNewPin still rejects invalid PIN format", () => {
    expect(validateNewPin("123")).toEqual({ ok: false, error: "Use a 4 to 6 digit PIN." });
    expect(validateNewPin("abcdef")).toEqual({ ok: false, error: "Use a 4 to 6 digit PIN." });
  });
});
