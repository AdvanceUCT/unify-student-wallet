import { z } from "zod";

const baseServicePointQrPayloadSchema = z.object({
  vendorId: z.string().min(1),
  servicePointId: z.string().min(1),
  nonce: z.string().min(1),
});

export const qrPayloadSchema = z.discriminatedUnion("type", [
  baseServicePointQrPayloadSchema.extend({
    type: z.literal("payment"),
    amount: z.number().nonnegative(),
  }),
  baseServicePointQrPayloadSchema.extend({
    type: z.literal("verification"),
  }),
]);

export type QrPayload = z.infer<typeof qrPayloadSchema>;

export function parseQrPayload(rawPayload: string) {
  try {
    const parsed = JSON.parse(rawPayload) as unknown;
    const result = qrPayloadSchema.safeParse(parsed);

    if (!result.success) {
      return { ok: false as const, error: result.error };
    }

    return { ok: true as const, data: result.data };
  } catch (error) {
    return { ok: false as const, error };
  }
}
