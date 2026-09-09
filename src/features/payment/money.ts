/**
 * @fileoverview Parses and formats ZAR values without floating-point money arithmetic.
 * @module features/payment/money
 */

const DECIMAL_AMOUNT = /^\d+(?:\.(\d{1,2}))?$/;

export type ParsedZarAmount =
  | { ok: true; amountMinor: number }
  | { ok: false; error: string };

export function parseZarAmount(value: string): ParsedZarAmount {
  const normalized = value.trim();
  if (!normalized) return { ok: false, error: "Enter an amount." };

  const match = DECIMAL_AMOUNT.exec(normalized);
  if (!match) {
    return { ok: false, error: "Use a valid amount with no more than two decimal places." };
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const amountMinor = BigInt(wholePart) * 100n + BigInt(fractionPart.padEnd(2, "0") || "0");

  if (amountMinor <= 0n) return { ok: false, error: "Amount must be at least R 0.01." };
  if (amountMinor > BigInt(Number.MAX_SAFE_INTEGER)) {
    return { ok: false, error: "Amount is too large." };
  }

  return { ok: true, amountMinor: Number(amountMinor) };
}

export function formatZarMinor(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) return "R —";
  const whole = Math.floor(amountMinor / 100);
  const cents = String(amountMinor % 100).padStart(2, "0");
  const groupedWhole = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `R ${groupedWhole}.${cents}`;
}
