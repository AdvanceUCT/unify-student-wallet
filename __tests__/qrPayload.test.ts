import {
  parseCheckoutVerificationLink,
  parseQrPayload,
  parseVerificationLink,
} from "@/src/lib/validation/qrPayload";

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

  it("accepts a static vendor payment payload with no amount or nonce", () => {
    const result = parseQrPayload(
      JSON.stringify({
        type: "payment",
        vendorId: "vendor-001",
        servicePointId: "library-cafe",
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.vendorId).toBe("vendor-001");
      expect(result.data.amount).toBeUndefined();
      expect(result.data.nonce).toBeUndefined();
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

  it("accepts a configured preview host", () => {
    const previousHosts = process.env.EXPO_PUBLIC_UNIFY_ACTIVATION_HOSTS;
    process.env.EXPO_PUBLIC_UNIFY_ACTIVATION_HOSTS =
      "voskuils.com,unify-admin-portal-git-feature-ce99ae-caleb-s-projects-28b6762a.vercel.app";

    try {
      expect(
        parseVerificationLink(
          "https://unify-admin-portal-git-feature-ce99ae-caleb-s-projects-28b6762a.vercel.app/verify/sp-public-001",
        ),
      ).toEqual({ ok: true, publicServicePointId: "sp-public-001" });
    } finally {
      if (previousHosts === undefined) delete process.env.EXPO_PUBLIC_UNIFY_ACTIVATION_HOSTS;
      else process.env.EXPO_PUBLIC_UNIFY_ACTIVATION_HOSTS = previousHosts;
    }
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

describe("parseCheckoutVerificationLink", () => {
  const token = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

  it.each([
    `https://voskuils.com/verify/checkout/verification-001?token=${token}`,
    `unifywallet://verify/checkout/verification-001?token=${token}`,
  ])("accepts a trusted checkout verification link: %s", (value) => {
    expect(parseCheckoutVerificationLink(value)).toEqual({
      ok: true,
      verificationRequestId: "verification-001",
      claimToken: token,
    });
  });

  it("accepts checkout links from a configured preview host", () => {
    const previousHosts = process.env.EXPO_PUBLIC_UNIFY_ACTIVATION_HOSTS;
    process.env.EXPO_PUBLIC_UNIFY_ACTIVATION_HOSTS =
      "voskuils.com,unify-admin-portal-git-feature-ce99ae-caleb-s-projects-28b6762a.vercel.app";

    try {
      expect(
        parseCheckoutVerificationLink(
          `https://unify-admin-portal-git-feature-ce99ae-caleb-s-projects-28b6762a.vercel.app/verify/checkout/verification-001?token=${token}`,
        ),
      ).toEqual({ ok: true, verificationRequestId: "verification-001", claimToken: token });
    } finally {
      if (previousHosts === undefined) delete process.env.EXPO_PUBLIC_UNIFY_ACTIVATION_HOSTS;
      else process.env.EXPO_PUBLIC_UNIFY_ACTIVATION_HOSTS = previousHosts;
    }
  });

  it.each([
    `http://voskuils.com/verify/checkout/verification-001?token=${token}`,
    `https://evil.example/verify/checkout/verification-001?token=${token}`,
    "https://voskuils.com/verify/checkout/verification-001",
    `https://voskuils.com/verify/checkout/verification-001?token=${token}&extra=1`,
    `https://voskuils.com/verify/checkout/verification-001?token=${token}#fragment`,
    "unifywallet://verify/checkout/verification-001?token=short",
  ])("rejects an untrusted or malformed checkout link: %s", (value) => {
    expect(parseCheckoutVerificationLink(value).ok).toBe(false);
  });
});
