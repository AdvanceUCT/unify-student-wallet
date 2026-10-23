import { useQuery } from "@tanstack/react-query";
import { useHolderAgent } from "./HolderAgentProvider";
import { useWalletSession } from "./WalletSessionProvider";
import { getStoredCredentialsLazy } from "./holderAgentRuntime";
import { boundedCredentialRead } from "./credentialRead";

export function useWalletCredentials() {
  const holder = useHolderAgent();
  const { session } = useWalletSession();
  const walletId = session.walletId;
  return useQuery({
    queryKey: ["stored-credentials", walletId ?? "no-wallet", holder.generation ?? 0],
    enabled: Boolean(walletId),
    retry: false,
    queryFn: ({ signal }) => boundedCredentialRead((async () => {
      if (!walletId) throw new Error("No wallet selected.");
      const agent = holder.status === "ready" && holder.walletId === walletId
        ? holder.agent : await holder.ensureWalletReady(walletId);
      if (signal.aborted) throw new Error("Wallet changed while opening.");
      return getStoredCredentialsLazy(agent, signal);
    })(), 15000, "open and read credentials", signal),
  });
}
