/**
 * @fileoverview Strictly parses activation, service-point, checkout, and generic QR payloads.
 * @module lib/validation/qrPayload
 */

const PUBLIC_SERVICE_POINT_ID = /^[A-Za-z0-9_-]+$/;
const CHECKOUT_CLAIM_TOKEN = /^[A-Za-z0-9_-]{20,256}$/;
const PAYMENT_QR_IDENTIFIER = /^[A-Za-z0-9_-]{8,128}$/;
const TOP_UP_ID = /^[A-Za-z0-9_-]{6,160}$/;

/** Checks an opaque branch identifier before it is used in an API path. */
export function isPaymentQrIdentifier(value: string) {
  return PAYMENT_QR_IDENTIFIER.test(value);
}

/** Parses a payment QR without accepting embedded amounts, vendor data, or secrets. */
export function parsePaymentLink(rawValue: string) {
  try {
    const url = new URL(rawValue.trim());
    const segments = url.pathname.split("/").filter(Boolean);

    if (
      url.protocol !== "unifywallet:" ||
      url.hostname !== "pay" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      segments.length !== 1
    ) {
      return { ok: false as const };
    }

    const qrIdentifier = decodeURIComponent(segments[0]);
    if (!isPaymentQrIdentifier(qrIdentifier)) return { ok: false as const };

    return { ok: true as const, qrIdentifier };
  } catch {
    return { ok: false as const };
  }
}

export function parseTopUpReturnLink(rawValue: string) {
  try {
    const url = new URL(rawValue.trim());

    if (
      url.protocol !== "unifywallet:" ||
      url.hostname !== "topup-return" ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "" ||
      url.hash
    ) {
      return { ok: false as const };
    }

    const topUpId = url.searchParams.get("topUpId");
    if (
      !topUpId ||
      url.searchParams.getAll("topUpId").length !== 1 ||
      [...url.searchParams.keys()].some((key) => key !== "topUpId") ||
      !TOP_UP_ID.test(topUpId)
    ) {
      return { ok: false as const };
    }

    return { ok: true as const, topUpId };
  } catch {
    return { ok: false as const };
  }
}

function allowedVerificationHosts() {
  const configured: string =
    process.env.EXPO_PUBLIC_UNIFY_ACTIVATION_HOSTS ??
    process.env.EXPO_PUBLIC_UNIFY_ACTIVATION_HOST ??
    "voskuils.com";

  return new Set(
    configured
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isTrustedHttpsVerificationUrl(url: URL) {
  // Host allowlisting alone is insufficient: reject downgraded URLs, alternate
  // ports, and embedded credentials before interpreting any path as a deep link.
  return (
    url.protocol === "https:" &&
    allowedVerificationHosts().has(url.hostname.toLowerCase()) &&
    !url.port &&
    !url.username &&
    !url.password
  );
}

export type CheckoutVerificationLink = {
  verificationRequestId: string;
  claimToken: string;
};

/** Parses a trusted checkout URL and extracts its single-use claim capability. */
export function parseCheckoutVerificationLink(rawValue: string) {
  try {
    const url = new URL(rawValue.trim());
    let encodedId: string | undefined;

    if (isTrustedHttpsVerificationUrl(url)) {
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length === 3 && segments[0] === "verify" && segments[1] === "checkout") {
        encodedId = segments[2];
      }
    } else if (url.protocol === "unifywallet:" && url.hostname === "verify") {
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length === 2 && segments[0] === "checkout") encodedId = segments[1];
    }

    const claimToken = url.searchParams.get("token");
    // Accept exactly one capability parameter. Extra query state or fragments
    // could otherwise create different interpretations across app and browser.
    if (
      !encodedId ||
      !claimToken ||
      [...url.searchParams.keys()].some((key) => key !== "token") ||
      url.searchParams.getAll("token").length !== 1 ||
      url.hash
    ) {
      return { ok: false as const };
    }

    const verificationRequestId = decodeURIComponent(encodedId);
    // Restrictive alphabets prevent decoded path separators and require enough
    // entropy for the checkout claim capability.
    if (!PUBLIC_SERVICE_POINT_ID.test(verificationRequestId) || !CHECKOUT_CLAIM_TOKEN.test(claimToken)) {
      return { ok: false as const };
    }

    return { ok: true as const, verificationRequestId, claimToken };
  } catch {
    return { ok: false as const };
  }
}

/** Parses a trusted static service-point verification URL. */
export function parseVerificationLink(rawValue: string) {
  try {
    const url = new URL(rawValue.trim());
    let encodedId: string | undefined;

    if (isTrustedHttpsVerificationUrl(url)) {
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length === 2 && segments[0] === "verify") encodedId = segments[1];
    } else if (url.protocol === "unifywallet:" && url.hostname === "verify") {
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length === 1) encodedId = segments[0];
    }

    if (!encodedId || url.search || url.hash) return { ok: false as const };
    const publicServicePointId = decodeURIComponent(encodedId);
    if (!PUBLIC_SERVICE_POINT_ID.test(publicServicePointId)) return { ok: false as const };

    return { ok: true as const, publicServicePointId };
  } catch {
    return { ok: false as const };
  }
}
