import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { z } from "zod";
import { deleteSecureValue, getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

import { assertPaymentScope, getPaymentScope } from "./paymentScope";

export const CHECKOUT_STORAGE_KEY = "unify.payment.checkout.v2";
export const LEGACY_POS_STORAGE_KEY = "unify.payment.pending-request.v1";
const terms = z.object({ amountMinor: z.number().int().positive().safe(), currency: z.literal("ZAR"), vendorName: z.string().min(1), branchName: z.string().min(1), vendorBranchId: z.string().min(1), orderReference: z.string().optional(), expiresAt: z.string().datetime().optional() });
const common = { version: z.literal(2), idempotencyKey: z.string().min(1).max(128), phase: z.enum(["REVIEW", "SUBMITTED", "UNKNOWN"]), accountId: z.string().min(1).optional(), terms: terms.optional(), legacyUnbound: z.boolean().optional() };
const checkoutSchema = z.discriminatedUnion("kind", [z.object({ ...common, kind: z.literal("POS"), id: z.string().regex(/^[A-Za-z0-9_-]{32}$/) }), z.object({ ...common, kind: z.literal("STATIC"), qrIdentifier: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/), amountMinor: z.number().int().positive().safe().optional() })]).refine((checkout) => checkout.phase === "REVIEW" || checkout.kind !== "STATIC" || Boolean(checkout.amountMinor && checkout.terms && checkout.accountId));
export type Checkout = z.infer<typeof checkoutSchema>;
export type CheckoutTerms = z.infer<typeof terms>;
const web = new Map<string, string>();
let mutations: Promise<unknown> = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> { const next = mutations.then(work, work); mutations = next.catch(() => {}); return next; }
async function read(key: string) { return Platform.OS === "web" ? web.get(key) ?? null : getSecureValue(key); }
async function write(key: string, value: string) { if (Platform.OS === "web") web.set(key, value); else await saveSecureValue(key, value); }
async function remove(key: string) { web.delete(key); if (Platform.OS !== "web") await deleteSecureValue(key); }
export async function loadCheckout(): Promise<Checkout | null> {
  const raw = await read(CHECKOUT_STORAGE_KEY);
  if (raw) return checkoutSchema.parse(JSON.parse(raw));
  const legacy = await read(LEGACY_POS_STORAGE_KEY);
  if (!legacy) return null;
  const old = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{32}$/), idempotencyKey: z.string().min(1).max(128), submitted: z.boolean() }).parse(JSON.parse(legacy));
  return { version: 2, kind: "POS", id: old.id, idempotencyKey: old.idempotencyKey, phase: old.submitted ? "UNKNOWN" : "REVIEW", ...(old.submitted ? { legacyUnbound: true } : {}) };
}
async function persist(checkout: Checkout) { await write(CHECKOUT_STORAGE_KEY, JSON.stringify(checkoutSchema.parse(checkout))); await remove(LEGACY_POS_STORAGE_KEY); }
export async function saveCheckout(checkout: Checkout) {
  const owner = getPaymentScope();
  return serial(async () => {
    assertPaymentScope(owner);
    const old = await loadCheckout();
    assertPaymentScope(owner);
    if (old && old.phase !== "REVIEW") {
      if (old.idempotencyKey !== checkout.idempotencyKey || old.kind !== checkout.kind || (old.kind === "POS" && checkout.kind === "POS" && old.id !== checkout.id) || (old.kind === "STATIC" && checkout.kind === "STATIC" && (old.qrIdentifier !== checkout.qrIdentifier || old.amountMinor !== checkout.amountMinor))) throw new Error("Recover the interrupted payment before starting another checkout.");
      if (old.accountId !== checkout.accountId || old.terms && JSON.stringify(old.terms) !== JSON.stringify(checkout.terms)) throw new Error("Submitted payment terms and account cannot change.");
    }
    await persist(checkout); return checkout;
  });
}
export async function selectPosCheckout(id: string) {
  const owner = getPaymentScope();
  return serial(async () => {
    assertPaymentScope(owner);
    if (!/^[A-Za-z0-9_-]{32}$/.test(id)) throw new Error("Invalid payment request.");
    const old = await loadCheckout();
    assertPaymentScope(owner);
    if (old?.kind === "POS" && old.id === id) return old;
    if (old && old.phase !== "REVIEW") throw new Error("Recover the interrupted payment before scanning another sale.");
    const next: Checkout = { version: 2, kind: "POS", id, idempotencyKey: Crypto.randomUUID(), phase: "REVIEW" };
    await persist(next); return next;
  });
}
export async function selectStaticCheckout(_input: { qrIdentifier: string; amountMinor: number; idempotencyKey: string }): Promise<Checkout> {
  throw new Error("Static payment QR codes are no longer supported. Ask the cashier for a POS sale QR.");
}
export async function clearCheckout(expectedKey?: string) {
  const owner = getPaymentScope();
  return serial(async () => {
    assertPaymentScope(owner);
    const old = await loadCheckout();
    assertPaymentScope(owner);
    if (expectedKey && old?.idempotencyKey !== expectedKey) return;
    await remove(CHECKOUT_STORAGE_KEY); await remove(LEGACY_POS_STORAGE_KEY);
  });
}
export async function selectStaticQr(_qrIdentifier: string): Promise<Checkout> {
  throw new Error("Static payment QR codes are no longer supported. Ask the cashier for a POS sale QR.");
}
export async function abandonReviewCheckout() {
  const owner = getPaymentScope();
  return serial(async () => {
    assertPaymentScope(owner);
    const old = await loadCheckout();
    assertPaymentScope(owner);
    if (old && old.phase !== "REVIEW") return false;
    await remove(CHECKOUT_STORAGE_KEY); await remove(LEGACY_POS_STORAGE_KEY); return true;
  });
}
