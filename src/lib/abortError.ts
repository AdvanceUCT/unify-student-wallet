/**
 * @fileoverview Recognizes cancellation failures so navigation does not surface them as user errors.
 * @module lib/abortError
 */

export function createAbortError(message: string) {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}
