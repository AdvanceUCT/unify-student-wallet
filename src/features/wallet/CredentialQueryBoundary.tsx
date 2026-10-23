import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type PropsWithChildren } from "react";
import { useHolderAgent } from "./HolderAgentProvider";
import { useWalletSession } from "./WalletSessionProvider";

export function CredentialQueryBoundary({ children }: PropsWithChildren) {
  const client = useQueryClient();
  const holder = useHolderAgent();
  const { session } = useWalletSession();
  useEffect(() => {
    const filters = { predicate: (query: { queryKey: readonly unknown[] }) =>
      ["stored-credentials", "credential"].includes(String(query.queryKey[0])) &&
      (query.queryKey[1] !== session.walletId || query.queryKey[2] !== (holder.generation ?? 0)) };
    void client.cancelQueries(filters);
    client.removeQueries(filters);
  }, [client, session.walletId, holder.generation]);
  return children;
}
