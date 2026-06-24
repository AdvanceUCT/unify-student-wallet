import { z } from "zod";

const paymentQrPayloadSchema = z.object({
  type: z.literal("payment"),
  vendorId: z.string().min(1),
  servicePointId: z.string().min(1),
  nonce: z.string().min(1),
  amount: z.number().nonnegative(),
});

export type QrPayload = z.infer<typeof paymentQrPayloadSchema>;

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

export function parseVerificationLink(rawValue: string) {
  try {
    const url = new URL(rawValue.trim());
    let encodedId: string | undefined;

    if (
      url.protocol === "https:" &&
      url.hostname.toLowerCase() === "voskuils.com" &&
      !url.port &&
      !url.username &&
      !url.password
    ) {
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
