import { getCachedHolderAgent } from "./holderAgent";

export type HandshakePhase =
  | "idle"
  | "invited"
  | "requesting"
  | "responded"
  | "completed"
  | "abandoned"
  | "failed";

export type EstablishedConnection = {
  connectionId: string;
  establishedAt: string;
  label: string;
};

function base64Decode(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

export function extractOobInvitation(rawUrl: string): string | null {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const oob = url.searchParams.get("oob") ?? url.searchParams.get("_oob");

  if (!oob?.trim()) {
    return null;
  }

  try {
    const decoded = base64Decode(oob);
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    const hasV1Shape = typeof parsed["@type"] === "string" && typeof parsed["@id"] === "string";
    const hasV2Shape = typeof parsed.type === "string" && typeof parsed.id === "string";

    if (!hasV1Shape && !hasV2Shape) {
      return null;
    }
  } catch {
    return null;
  }

  return rawUrl;
}

function credoStateToPhase(state?: string): HandshakePhase {
  switch (state) {
    case "invited":
      return "invited";
    case "start":
    case "request":
      return "requesting";
    case "responded":
      return "responded";
    case "complete":
      return "completed";
    case "abandoned":
      return "abandoned";
    default:
      return "requesting";
  }
}

export async function initiateHandshake(
  invitationUrl: string,
): Promise<{ connectionId: string; issuerLabel: string }> {
  const agent = getCachedHolderAgent();

  if (!agent) {
    throw new Error("Wallet agent is not running. Unlock the wallet first.");
  }

  const result = await agent.didcomm?.oob?.receiveInvitationFromUrl?.(invitationUrl, {
    autoAcceptConnection: true,
    autoAcceptInvitation: true,
    label: "UNIFY Student Wallet",
  });

  const connectionId = result?.connectionRecord?.id;

  if (!connectionId) {
    throw new Error("University agent did not return a connection record. Check the invitation URL.");
  }

  const issuerLabel = result.connectionRecord?.theirLabel ?? "University Agent";

  return { connectionId, issuerLabel };
}

export async function pollHandshakePhase(connectionId: string): Promise<HandshakePhase> {
  const agent = getCachedHolderAgent();

  if (!agent) {
    return "failed";
  }

  try {
    const record = await agent.didcomm?.connections?.getById?.(connectionId);

    if (!record) {
      return "failed";
    }

    return credoStateToPhase(record.state);
  } catch {
    return "failed";
  }
}

export async function getEstablishedConnections(): Promise<EstablishedConnection[]> {
  const agent = getCachedHolderAgent();

  if (!agent) {
    return [];
  }

  const records = (await agent.didcomm?.connections?.getAll?.()) ?? [];

  return records
    .filter((r) => r.state === "complete" && r.id)
    .map((r) => ({
      connectionId: r.id as string,
      establishedAt:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : (r.createdAt ?? new Date().toISOString()),
      label: r.theirLabel ?? "University Agent",
    }));
}
