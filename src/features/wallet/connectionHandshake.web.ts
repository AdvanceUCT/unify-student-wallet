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

export async function initiateHandshake(
  _invitationUrl: string,
): Promise<{ connectionId: string; issuerLabel: string }> {
  throw new Error("DIDComm connections are not available on web.");
}

export async function pollHandshakePhase(_connectionId: string): Promise<HandshakePhase> {
  return "failed";
}

export async function getEstablishedConnections(): Promise<EstablishedConnection[]> {
  return [];
}
