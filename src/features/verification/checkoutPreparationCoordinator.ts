import type { StartVerificationSessionResult } from "@/src/lib/api/verification";
import type { VerificationProofSelection } from "@/src/features/wallet/holderAgent";

export type CheckoutPreparationProgress =
  | "opening-request"
  | "receiving-request"
  | "matching-credential";

export type CheckoutPreparationResult = {
  selection: VerificationProofSelection;
  sessionInfo: StartVerificationSessionResult;
};

type PreparationEntry = {
  controller: AbortController;
  listeners: Set<(progress: CheckoutPreparationProgress) => void>;
  progress: CheckoutPreparationProgress;
  promise: Promise<CheckoutPreparationResult>;
  settled: boolean;
};

const preparations = new Map<string, PreparationEntry>();

function checkoutAbortError() {
  const error = new Error("Checkout preparation aborted");
  error.name = "AbortError";
  return error;
}

export function checkoutPreparationKey(walletId: string, verificationRequestId: string) {
  return `${walletId}:${verificationRequestId}`;
}

export function acquireCheckoutPreparation({
  key,
  onProgress,
  prepare,
}: {
  key: string;
  onProgress: (progress: CheckoutPreparationProgress) => void;
  prepare: (context: {
    signal: AbortSignal;
    setProgress: (progress: CheckoutPreparationProgress) => void;
  }) => Promise<CheckoutPreparationResult>;
}) {
  let entry = preparations.get(key);

  if (!entry) {
    const controller = new AbortController();
    const listeners = new Set<(progress: CheckoutPreparationProgress) => void>();
    const created: PreparationEntry = {
      controller,
      listeners,
      progress: "opening-request",
      promise: Promise.resolve(null as never),
      settled: false,
    };
    const setProgress = (progress: CheckoutPreparationProgress) => {
      created.progress = progress;
      created.listeners.forEach((listener) => listener(progress));
    };
    created.promise = prepare({ signal: controller.signal, setProgress })
      .then((result) => {
        created.settled = true;
        return result;
      })
      .catch((error) => {
        created.settled = true;
        preparations.delete(key);
        if (controller.signal.aborted) throw checkoutAbortError();
        throw error;
      });
    preparations.set(key, created);
    entry = created;
  }

  entry.listeners.add(onProgress);
  onProgress(entry.progress);

  let released = false;
  return {
    promise: entry.promise,
    release: () => {
      if (released) return;
      released = true;
      entry?.listeners.delete(onProgress);
      if (entry && entry.listeners.size === 0 && !entry.settled) {
        entry.controller.abort();
        preparations.delete(key);
      }
    },
  };
}

export function clearCheckoutPreparation(key: string) {
  const entry = preparations.get(key);
  if (!entry) return;
  entry.controller.abort();
  preparations.delete(key);
}

export function clearAllCheckoutPreparationsForTests() {
  preparations.forEach((entry) => entry.controller.abort());
  preparations.clear();
}
