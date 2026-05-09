import {
  extractOobInvitation,
  getEstablishedConnections,
  initiateHandshake,
  pollHandshakePhase,
  type EstablishedConnection,
  type HandshakePhase,
} from "@/src/features/wallet/connectionHandshake";
import type { ConnectionRecord } from "@/src/features/wallet/holderAgent";

// ---------------------------------------------------------------------------
// Agent mock
// ---------------------------------------------------------------------------

type MockConnections = {
  getAll?: jest.Mock;
  getById?: jest.Mock;
};

type MockOob = {
  receiveInvitationFromUrl?: jest.Mock;
};

type MockDidcomm = {
  connections?: MockConnections;
  oob?: MockOob;
};

type MockAgent = {
  didcomm?: MockDidcomm;
} | null;

let mockAgentRef: MockAgent = null;

jest.mock("@/src/features/wallet/holderAgent", () => ({
  getCachedHolderAgent: () => mockAgentRef,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function makeOobUrl(invitation: Record<string, unknown>): string {
  return `https://university.edu/invite?oob=${base64UrlEncode(JSON.stringify(invitation))}`;
}

const validV1Invitation = {
  "@id": "invite-001",
  "@type": "https://didcomm.org/out-of-band/1.1/invitation",
  label: "University Agent",
  handshake_protocols: ["https://didcomm.org/didexchange/1.0"],
  services: [],
};

const validV2Invitation = {
  id: "invite-002",
  type: "https://didcomm.org/out-of-band/2.0/invitation",
  body: {},
};

const validOobUrl = makeOobUrl(validV1Invitation);

// ---------------------------------------------------------------------------
// extractOobInvitation
// ---------------------------------------------------------------------------

describe("extractOobInvitation", () => {
  it("returns the original URL for a valid DIDComm v1 OOB invitation link", () => {
    expect(extractOobInvitation(validOobUrl)).toBe(validOobUrl);
  });

  it("accepts _oob parameter (DIDComm v2 style)", () => {
    const url = `https://university.edu/invite?_oob=${base64UrlEncode(JSON.stringify(validV2Invitation))}`;
    expect(extractOobInvitation(url)).toBe(url);
  });

  it("accepts a DIDComm v2 invitation envelope", () => {
    expect(extractOobInvitation(makeOobUrl(validV2Invitation))).not.toBeNull();
  });

  it("returns null for a URL with no oob parameter", () => {
    expect(extractOobInvitation("https://university.edu/invite?token=abc")).toBeNull();
  });

  it("returns null for a URL with an empty oob parameter", () => {
    expect(extractOobInvitation("https://university.edu/invite?oob=")).toBeNull();
  });

  it("returns null for a non-URL string", () => {
    expect(extractOobInvitation("not-a-url")).toBeNull();
  });

  it("returns null when the oob value is not valid base64", () => {
    expect(extractOobInvitation("https://university.edu/invite?oob=!!!notbase64!!!")).toBeNull();
  });

  it("returns null when the decoded oob JSON is missing @type/@id (v1) and type/id (v2)", () => {
    const badPayload = base64UrlEncode(JSON.stringify({ label: "Incomplete" }));
    expect(extractOobInvitation(`https://university.edu/invite?oob=${badPayload}`)).toBeNull();
  });

  it("returns null when the decoded oob value is valid base64 but not JSON", () => {
    expect(extractOobInvitation(`https://university.edu/invite?oob=${base64UrlEncode("hello world")}`)).toBeNull();
  });

  it("accepts custom-scheme deep link URLs (unifywallet://)", () => {
    const url = `unifywallet://connect?oob=${base64UrlEncode(JSON.stringify(validV1Invitation))}`;
    expect(extractOobInvitation(url)).toBe(url);
  });
});

// ---------------------------------------------------------------------------
// initiateHandshake
// ---------------------------------------------------------------------------

describe("initiateHandshake", () => {
  beforeEach(() => {
    mockAgentRef = null;
  });

  it("throws when no agent is running", async () => {
    await expect(initiateHandshake(validOobUrl)).rejects.toThrow("Wallet agent is not running");
  });

  it("returns connectionId and issuerLabel on success", async () => {
    mockAgentRef = {
      didcomm: {
        oob: {
          receiveInvitationFromUrl: jest.fn(async () => ({
            connectionRecord: { id: "conn-001", theirLabel: "UCT Digital Services", state: "invited" },
          })),
        },
      },
    };

    const result = await initiateHandshake(validOobUrl);

    expect(result.connectionId).toBe("conn-001");
    expect(result.issuerLabel).toBe("UCT Digital Services");
  });

  it("falls back to 'University Agent' when theirLabel is not set", async () => {
    mockAgentRef = {
      didcomm: {
        oob: {
          receiveInvitationFromUrl: jest.fn(async () => ({
            connectionRecord: { id: "conn-002" },
          })),
        },
      },
    };

    const result = await initiateHandshake(validOobUrl);

    expect(result.issuerLabel).toBe("University Agent");
  });

  it("throws when the agent returns no connectionRecord", async () => {
    mockAgentRef = {
      didcomm: {
        oob: {
          receiveInvitationFromUrl: jest.fn(async () => ({ outOfBandRecord: { id: "oob-001" } })),
        },
      },
    };

    await expect(initiateHandshake(validOobUrl)).rejects.toThrow("did not return a connection record");
  });

  it("throws when the connectionRecord has no id", async () => {
    mockAgentRef = {
      didcomm: {
        oob: {
          receiveInvitationFromUrl: jest.fn(async () => ({
            connectionRecord: { theirLabel: "UCT" },
          })),
        },
      },
    };

    await expect(initiateHandshake(validOobUrl)).rejects.toThrow("did not return a connection record");
  });
});

// ---------------------------------------------------------------------------
// pollHandshakePhase
// ---------------------------------------------------------------------------

describe("pollHandshakePhase", () => {
  beforeEach(() => {
    mockAgentRef = null;
  });

  const cases: Array<[string | undefined, HandshakePhase]> = [
    ["invited", "invited"],
    ["start", "requesting"],
    ["request", "requesting"],
    ["responded", "responded"],
    ["complete", "completed"],
    ["abandoned", "abandoned"],
    [undefined, "requesting"],
    ["unknown-state", "requesting"],
  ];

  it.each(cases)("maps Credo state '%s' to phase '%s'", async (credoState, expectedPhase) => {
    mockAgentRef = {
      didcomm: {
        connections: {
          getById: jest.fn(async () => ({ id: "conn-001", state: credoState })),
        },
      },
    };

    await expect(pollHandshakePhase("conn-001")).resolves.toBe(expectedPhase);
  });

  it("returns 'failed' when no agent is running", async () => {
    await expect(pollHandshakePhase("conn-001")).resolves.toBe("failed");
  });

  it("returns 'failed' when the connection record is not found", async () => {
    mockAgentRef = {
      didcomm: {
        connections: {
          getById: jest.fn(async () => null),
        },
      },
    };

    await expect(pollHandshakePhase("conn-001")).resolves.toBe("failed");
  });

  it("returns 'failed' when getById throws", async () => {
    mockAgentRef = {
      didcomm: {
        connections: {
          getById: jest.fn(async () => {
            throw new Error("DB error");
          }),
        },
      },
    };

    await expect(pollHandshakePhase("conn-001")).resolves.toBe("failed");
  });
});

// ---------------------------------------------------------------------------
// getEstablishedConnections
// ---------------------------------------------------------------------------

describe("getEstablishedConnections", () => {
  beforeEach(() => {
    mockAgentRef = null;
  });

  it("returns an empty array when no agent is running", async () => {
    await expect(getEstablishedConnections()).resolves.toEqual([]);
  });

  it("returns an empty array when getAll is unavailable", async () => {
    mockAgentRef = { didcomm: {} };
    await expect(getEstablishedConnections()).resolves.toEqual([]);
  });

  it("filters out non-complete connections", async () => {
    const records: ConnectionRecord[] = [
      { id: "conn-001", state: "complete", theirLabel: "UCT" },
      { id: "conn-002", state: "request", theirLabel: "CPUT" },
      { id: "conn-003", state: "abandoned", theirLabel: "Stellenbosch" },
    ];
    mockAgentRef = {
      didcomm: {
        connections: { getAll: jest.fn(async () => records) },
      },
    };

    const result = await getEstablishedConnections();

    expect(result).toHaveLength(1);
    expect(result[0].connectionId).toBe("conn-001");
    expect(result[0].label).toBe("UCT");
  });

  it("falls back to 'University Agent' when theirLabel is absent", async () => {
    const records: ConnectionRecord[] = [{ id: "conn-001", state: "complete" }];
    mockAgentRef = {
      didcomm: { connections: { getAll: jest.fn(async () => records) } },
    };

    const result = await getEstablishedConnections();

    expect(result[0].label).toBe("University Agent");
  });

  it("formats a Date createdAt as an ISO string", async () => {
    const at = new Date("2026-05-09T10:00:00.000Z");
    const records: ConnectionRecord[] = [{ id: "conn-001", state: "complete", createdAt: at }];
    mockAgentRef = {
      didcomm: { connections: { getAll: jest.fn(async () => records) } },
    };

    const result = await getEstablishedConnections();

    expect(result[0].establishedAt).toBe("2026-05-09T10:00:00.000Z");
  });

  it("uses a string createdAt value directly", async () => {
    const records: ConnectionRecord[] = [
      { id: "conn-001", state: "complete", createdAt: "2026-05-09T10:00:00.000Z" },
    ];
    mockAgentRef = {
      didcomm: { connections: { getAll: jest.fn(async () => records) } },
    };

    const result: EstablishedConnection[] = await getEstablishedConnections();

    expect(result[0].establishedAt).toBe("2026-05-09T10:00:00.000Z");
  });
});
