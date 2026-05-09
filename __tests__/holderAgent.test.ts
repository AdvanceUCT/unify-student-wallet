import {
  acceptHolderActivation,
  getCachedHolderAgent,
  getCredentialRecords,
  pollMediatorForMessages,
  resumeHolderAgentSession,
} from "@/src/features/wallet/holderAgent";

// The native Credo modules (Askar, AnoncCreds, IndyVdr) cannot load in Jest.
// These tests verify the exported API surface and safe fallback behaviour;
// the actual DIDComm and mediator logic is covered by on-device integration tests.

jest.mock("@/src/lib/storage/secureStore", () => ({
  deleteSecureValue: jest.fn(async () => undefined),
  getSecureValue: jest.fn(async () => null),
  saveSecureValue: jest.fn(async () => undefined),
}));

describe("getCachedHolderAgent", () => {
  it("returns null before the agent has been initialized", () => {
    expect(getCachedHolderAgent()).toBeNull();
  });
});

describe("getCredentialRecords", () => {
  it("returns an empty array when no agent is cached", async () => {
    await expect(getCredentialRecords()).resolves.toEqual([]);
  });
});

describe("pollMediatorForMessages", () => {
  it("resolves without throwing when no agent is cached", async () => {
    await expect(pollMediatorForMessages()).resolves.toBeUndefined();
  });
});

describe("acceptHolderActivation (test-env fallback)", () => {
  const activation = {
    activationId: "activation-test-001",
    activationSource: "oob" as const,
    createdAt: "2026-05-09T10:00:00.000Z",
    invitationId: "oob-test-001",
    invitationUrl: "https://issuer.test/oob?oob=abc",
    issuerLabel: "UNIFY Issuer",
    ledgerName: "BCovrin Test" as const,
    studentId: "student-001",
    walletId: "wallet-001",
  };

  it("returns a fallback result (native modules unavailable in Jest)", async () => {
    const result = await acceptHolderActivation(activation);

    // holderAgentInitialized is false in the test-env fallback path
    expect(result.holderAgentInitialized).toBe(false);
    expect(result.credentialRecordId).toContain("activation-test-001");
    expect(result.holderConnectionId).toContain("oob-test-001");
  });

  it("does not throw in the test environment", async () => {
    await expect(acceptHolderActivation(activation)).resolves.toBeDefined();
  });
});

describe("resumeHolderAgentSession (test-env fallback)", () => {
  it("resolves without throwing when native modules are unavailable", async () => {
    await expect(resumeHolderAgentSession("wallet-001")).resolves.toBeUndefined();
  });

  it("resolves without throwing when called with a mediator URL override", async () => {
    await expect(
      resumeHolderAgentSession("wallet-001", "https://custom-mediator.test/?oob=x"),
    ).resolves.toBeUndefined();
  });
});
