import * as Crypto from "expo-crypto";

export type PinValidationResult = { ok: true } | { ok: false; error: string };

// Common sequential and repeated-digit patterns that are trivially guessable.
// Covers 4-digit and 6-digit variants of each pattern.
const WEAK_PINS = new Set([
  "1234", "2345", "3456", "4567", "5678", "6789", "9876", "8765", "7654", "6543", "5432", "4321",
  "123456", "234567", "345678", "456789", "987654", "876543", "765432", "654321", "543210",
  "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999",
  "000000", "111111", "222222", "333333", "444444", "555555", "666666", "777777", "888888", "999999",
  "1212", "1221", "1122", "2211", "1010", "0101",
  "121212", "112233", "123123", "321321",
]);

export function validatePin(pin: string): PinValidationResult {
  if (!/^\d{4,6}$/.test(pin)) {
    return { ok: false, error: "Use a 4 to 6 digit PIN." };
  }

  return { ok: true };
}

export function validateNewPin(newPin: string): PinValidationResult {
  const baseValidation = validatePin(newPin);
  if (!baseValidation.ok) return baseValidation;

  if (WEAK_PINS.has(newPin)) {
    return { ok: false, error: "This PIN is too easy to guess. Choose a less predictable combination." };
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
