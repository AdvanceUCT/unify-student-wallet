export function createAbortError(message: string) {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

