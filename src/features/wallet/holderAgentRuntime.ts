import type * as HolderAgentModule from "./holderAgent";

export type HolderAgentRuntime = typeof HolderAgentModule;

let runtimePromise: Promise<HolderAgentRuntime> | null = null;

export function loadHolderAgentRuntime() {
  runtimePromise ??= Promise.resolve()
    .then(
      // Jest cannot execute VM dynamic imports; a deferred require also stays lazy under Metro.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      () => require("./holderAgent") as HolderAgentRuntime,
    )
    .catch((error: unknown) => {
      runtimePromise = null;
      throw error;
    });
  return runtimePromise;
}

export function loadedHolderAgentRuntime() {
  return runtimePromise;
}
