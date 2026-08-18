/**
 * @fileoverview Strictly parses activation, service-point, checkout, and generic QR payloads.
 * @module lib/validation/qrPayload
 */

import { z } from "zod";

const paymentQrPayloadSchema = z.object({
  type: z.literal("payment"),
  vendorId: z.string().min(1),
  servicePointId: z.string().min(1),
  // The static vendor payment QR carries neither field: the wallet generates
  // the nonce and the student enters the amount at payment time.
  nonce: z.string().min(1).optional(),
  amount: z.number().nonnegative().optional(),
});

export type QrPayload = z.infer<typeof paymentQrPayloadSchema>;

/** Classifies a scanned value without treating arbitrary text as a trusted deep link. */
export function parseQrPayload(rawPayload: string) {
  try {
    const result = paymentQrPayloadSchema.safeParse(JSON.parse(rawPayload) as unknown);
    return result.success
      ? { ok: true as const, data: result.data }
      : { ok: false as const, error: result.error };
  } catch (error) {
    return { ok: false as const, error };
  }
}

const PUBLIC_SERVICE_POINT_ID = /^[A-Za-z0-9_-]+$/;
const CHECKOUT_CLAIM_TOKEN = /^[A-Za-z0-9_-]{20,256}$/;

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
