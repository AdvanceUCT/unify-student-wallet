import * as Crypto from "expo-crypto";

export type PinValidationResult = { ok: true } | { ok: false; error: string };

export function validatePin(pin: string): PinValidationResult {
  if (!/^\d{4,6}$/.test(pin)) {
    return { ok: false, error: "Use a 4 to 6 digit PIN." };
  }

  return { ok: true };
}

export function validatePinConfirmation(pin: string, confirmation: string): PinValidationResult {
  const validation = validatePin(pin);

  if (!validation.ok) {
    return validation;
  }

  if (pin !== confirmation) {
    return { ok: false, error: "PIN entries do not match." };
  }

  return { ok: true };
}

export function createPinSalt() {
  return Crypto.randomUUID();
}

export async function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function verifyPin(pin: string, salt: string, expectedHash: string) {
  return (await hashPin(pin, salt)) === expectedHash;
}
