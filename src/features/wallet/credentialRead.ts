/** Bounds UI work without cancelling or replacing the encrypted wallet itself. */
export function boundedCredentialRead<T>(operation: Promise<T>, timeoutMs: number, stage: string, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error, value?: T) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (error) reject(error); else resolve(value as T);
    };
    const abort = () => finish(new Error("Credential read superseded."));
    const timer = setTimeout(() => {
      // Stage only: never log credential attributes, keys or recovery passwords.
      console.warn(`[wallet-read] ${stage} timed out`);
      finish(new Error("Reading your wallet took too long. Try again."));
    }, timeoutMs);
    if (signal?.aborted) abort(); else signal?.addEventListener("abort", abort, { once: true });
    operation.then(value => finish(undefined, value), error => finish(error instanceof Error ? error : new Error("Unable to read wallet.")));
  });
}
