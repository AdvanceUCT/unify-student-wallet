import { parseQrPayload } from "@/src/lib/validation/qrPayload";

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

  it("accepts a valid service-point verification payload", () => {
    const result = parseQrPayload(
      JSON.stringify({
        vendorId: "vendor-001",
        servicePointId: "main-library",
        type: "verification",
        nonce: "proof-request-nonce",
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toBe("verification");
    }
  });

  it("rejects malformed payloads", () => {
    const result = parseQrPayload("not-json");

    expect(result.ok).toBe(false);
  });
});
