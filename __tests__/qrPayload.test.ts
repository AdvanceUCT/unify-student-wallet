import { parseQrPayload, parseVerificationLink } from "@/src/lib/validation/qrPayload";

describe("parseQrPayload", () => {
  it("accepts a valid service-point payment payload", () => {
    const result = parseQrPayload(
      JSON.stringify({
        vendorId: "vendor-001",
        servicePointId: "library-cafe",
        type: "payment",
        amount: 42.5,
        nonce: "demo-nonce",
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.servicePointId).toBe("library-cafe");
    }
  });

  it("rejects legacy verification JSON containing vendor and nonce data", () => {
    const result = parseQrPayload(
      JSON.stringify({
        vendorId: "vendor-001",
        servicePointId: "main-library",
        type: "verification",
        nonce: "proof-request-nonce",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects malformed payloads", () => {
    const result = parseQrPayload("not-json");

    expect(result.ok).toBe(false);
  });
});

describe("parseVerificationLink", () => {
  it.each([
    "https://voskuils.com/verify/sp-public-001",
    "unifywallet://verify/sp-public-001",
  ])("accepts a trusted static verification link: %s", (value) => {
    expect(parseVerificationLink(value)).toEqual({
      ok: true,
      publicServicePointId: "sp-public-001",
    });
  });

  it.each([
    "http://voskuils.com/verify/sp-public-001",
    "https://evil.example/verify/sp-public-001",
    "https://voskuils.com/verify/sp-public-001?nonce=attacker",
    "https://voskuils.com/verify/sp-public-001/extra",
    "unifywallet://payment/sp-public-001",
  ])("rejects an untrusted or malformed verification link: %s", (value) => {
    expect(parseVerificationLink(value).ok).toBe(false);
  });
});
