import {
  parseCheckoutVerificationLink,
  parsePaymentLink,
  parseVerificationLink,
} from "@/src/lib/validation/qrPayload";

describe("parsePaymentLink", () => {
  it("accepts an opaque branch payment link", () => {
    expect(parsePaymentLink("unifywallet://pay/branch_qr-001")).toEqual({
      ok: true,
      qrIdentifier: "branch_qr-001",
    });
  });

  it("rejects legacy JSON containing vendor-controlled payment details", () => {
    expect(parsePaymentLink(
      JSON.stringify({
        vendorId: "vendor-001",
        servicePointId: "library-cafe",
        type: "payment",
        amount: 42.5,
      }),
    ).ok).toBe(false);
  });

  it.each([
    "not-a-link",
    "unifywallet://payment/branch_qr-001",
    "unifywallet://pay/short",
    "unifywallet://pay/branch_qr-001/extra",
    "unifywallet://pay/branch_qr-001?amount=42.50",
    "unifywallet://pay/branch_qr-001#vendor",
    "https://voskuils.com/pay/branch_qr-001",
  ])("rejects an unsupported or data-bearing payment link: %s", (value) => {
    expect(parsePaymentLink(value).ok).toBe(false);
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
