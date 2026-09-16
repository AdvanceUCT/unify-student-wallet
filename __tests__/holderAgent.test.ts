import {
  __holderAgentTestInternals,
  clearActiveHolderAgent,
  exportEncryptedHolderWallet,
  acceptVerificationProof,
  getCredentialRecord,
  getStoredCredentials,
  receiveCredentialOffer,
  receiveVerificationProofRequest,
  selectVerificationCredentials,
  type HolderAgent,
} from "@/src/features/wallet/holderAgent";

describe("holder agent credential activation", () => {
  afterEach(() => {
    clearActiveHolderAgent();
    jest.restoreAllMocks();
  });

  it("processes a new invitation even when the wallet already contains credentials", async () => {
    const existingCredential = { id: "credential-existing", state: "done" };
    const newCredential = { id: "credential-new", state: "done" };
    const getAll = jest
      .fn()
      .mockResolvedValueOnce([existingCredential])
      .mockResolvedValueOnce([existingCredential, newCredential]);
    const receiveInvitationFromUrl = jest.fn(async () => ({}));

    __holderAgentTestInternals.setActiveHolderAgentForTest({
      didcomm: {
        credentials: { getAll },
        oob: { receiveInvitationFromUrl },
      },
      initialize: jest.fn(),
    } as unknown as HolderAgent);

    const result = await receiveCredentialOffer("https://issuer.example/oob/new");

    expect(receiveInvitationFromUrl).toHaveBeenCalledWith("https://issuer.example/oob/new", {
      autoAcceptConnection: true,
      autoAcceptInvitation: true,
      label: "UNIFY Student Wallet",
    });
    expect(result).toBe(newCredential);
  });

  it("loads offered attributes from Credo format data before acceptance", async () => {
    const getFormatData = jest.fn(async () => ({
      offerAttributes: [
        { name: "studentNumber", value: "STU001" },
        { name: "firstName", value: "Ada" },
        { name: "faculty", value: "Engineering" },
      ],
    }));

    __holderAgentTestInternals.setActiveHolderAgentForTest({
      didcomm: {
        credentials: {
          getById: jest.fn(async () => ({ id: "offer-001", state: "offer-received" })),
          getFormatData,
        },
      },
      initialize: jest.fn(),
    } as unknown as HolderAgent);

    await expect(getCredentialRecord("offer-001")).resolves.toMatchObject({
      id: "offer-001",
      credentialAttributes: [
        { name: "studentNumber", value: "STU001" },
        { name: "firstName", value: "Ada" },
        { name: "faculty", value: "Engineering" },
      ],
    });
    expect(getFormatData).toHaveBeenCalledWith("offer-001");
  });

  it("enriches stored credentials with signed offer attributes", async () => {
    const getFormatData = jest.fn(async (id: string) => ({
      offerAttributes: id === "credential-001"
        ? [
            { name: "validFrom", value: "2026-08-01T00:00:00.000Z" },
            { name: "expiresAt", value: "2027-08-01T00:00:00.000Z" },
          ]
        : [],
    }));

    __holderAgentTestInternals.setActiveHolderAgentForTest({
      didcomm: {
        credentials: {
          getAll: jest.fn(async () => [
            { id: "credential-001", state: "done" },
            {
              id: "credential-002",
              state: "credential-received",
              credentialAttributes: [
                { name: "studentNumber", value: "STU002" },
                { name: "validFrom", value: "2026-08-02T00:00:00.000Z" },
                { name: "expiresAt", value: "2027-08-02T00:00:00.000Z" },
              ],
            },
            { id: "offer-001", state: "offer-received" },
          ]),
          getFormatData,
        },
      },
      initialize: jest.fn(),
    } as unknown as HolderAgent);

    await expect(getStoredCredentials()).resolves.toEqual([
      {
        id: "credential-001",
        state: "done",
        credentialAttributes: [
          { name: "validFrom", value: "2026-08-01T00:00:00.000Z" },
          { name: "expiresAt", value: "2027-08-01T00:00:00.000Z" },
        ],
      },
      {
        id: "credential-002",
        state: "credential-received",
        credentialAttributes: [
          { name: "studentNumber", value: "STU002" },
          { name: "validFrom", value: "2026-08-02T00:00:00.000Z" },
          { name: "expiresAt", value: "2027-08-02T00:00:00.000Z" },
        ],
      },
    ]);
    expect(getFormatData).toHaveBeenCalledTimes(1);
    expect(getFormatData).toHaveBeenCalledWith("credential-001");
  });

  it("prefers signed attributes from the stored AnonCreds credential", async () => {
    const getCredential = jest.fn(async () => ({
      credentialId: "stored-credential-001",
      attributes: {
        studentNumber: "STU001",
        validFrom: "2026-08-01T00:00:00.000Z",
        expiresAt: "2027-08-01T00:00:00.000Z",
      },
    }));
    const getFormatData = jest.fn();

    __holderAgentTestInternals.setActiveHolderAgentForTest({
      didcomm: {
        credentials: {
          getAll: jest.fn(async () => [{
            id: "exchange-001",
            state: "done",
            credentials: [{ credentialRecordId: "stored-credential-001", credentialRecordType: "w3c" }],
            credentialAttributes: [
              { name: "studentNumber", value: "PREVIEW-STUDENT" },
              { name: "validFrom", value: "2025-01-01T00:00:00.000Z" },
            ],
          }]),
          getFormatData,
        },
      },
      initialize: jest.fn(),
      modules: { anoncreds: { getCredential } },
    } as unknown as HolderAgent);

    await expect(getStoredCredentials()).resolves.toEqual([
      expect.objectContaining({
        credentialAttributes: expect.arrayContaining([
          { name: "studentNumber", value: "STU001" },
          { name: "validFrom", value: "2026-08-01T00:00:00.000Z" },
          { name: "expiresAt", value: "2027-08-01T00:00:00.000Z" },
        ]),
      }),
    ]);
    expect(getCredential).toHaveBeenCalledWith("stored-credential-001");
    expect(getFormatData).not.toHaveBeenCalled();
  });
});

describe("holder agent backup", () => {
  afterEach(() => {
    clearActiveHolderAgent();
  });

  it("exports the active Askar store with password-based key derivation", async () => {
    const exportStore = jest.fn(async () => undefined);
    __holderAgentTestInternals.setActiveHolderAgentForTest({
      initialize: jest.fn(),
      modules: { askar: { exportStore, importStore: jest.fn() } },
    });

    await exportEncryptedHolderWallet("/cache/wallet.unifywallet", "long-recovery-password");

    expect(exportStore).toHaveBeenCalledWith({
      exportToStore: {
        id: "backup-test-wallet",
        key: "long-recovery-password",
        keyDerivationMethod: "kdf:argon2i:mod",
        database: { type: "sqlite", config: { path: "/cache/wallet.unifywallet" } },
      },
    });
  });

  it("uses the same backup store config for export and restore import", () => {
    expect(
      __holderAgentTestInternals.backupStoreConfig(
        "wallet-restored-001",
        "/cache/wallet.unifywallet",
        "long-recovery-password",
      ),
    ).toEqual({
      id: "backup-wallet-restored-001",
      key: "long-recovery-password",
      keyDerivationMethod: "kdf:argon2i:mod",
      database: { type: "sqlite", config: { path: "/cache/wallet.unifywallet" } },
    });
  });

  it("reads the wallet profile stored inside the backup", () => {
    expect(
      __holderAgentTestInternals.firstRestorableBackupProfile("wallet-original-001", [
        "wallet-original-001",
        "secondary-profile",
      ]),
    ).toBe("wallet-original-001");
    expect(__holderAgentTestInternals.firstRestorableBackupProfile(undefined, ["wallet-fallback-001"])).toBe(
      "wallet-fallback-001",
    );
    expect(() => __holderAgentTestInternals.firstRestorableBackupProfile(undefined, [])).toThrow(
      "The selected backup does not contain a restorable wallet profile.",
    );
  });

  it("imports a backup profile into a new local wallet id", () => {
    expect(
      __holderAgentTestInternals.restoredWalletImportPlan("wallet-original-001", () => "wallet-restored-001"),
    ).toEqual({
      sourceWalletId: "wallet-original-001",
      walletId: "wallet-restored-001",
    });
  });

  it("explains invalid backup database files clearly", () => {
    expect(
      __holderAgentTestInternals.backupOpenErrorFromUnknown(
        new Error("Error fetching store config caused by error from database code 1: no such table: config"),
      ),
    ).toEqual(
      new Error(
      "This file is not a valid UNIFY wallet backup. Create a new backup from the wallet and try restoring that file.",
      ),
    );
  });
});

describe("holder agent proof presentation", () => {
  afterEach(() => {
    clearActiveHolderAgent();
    jest.restoreAllMocks();
  });

  it("discovers request-received, selects exact values, and waits for explicit acceptance", async () => {
    const proof = { id: "proof-001", parentThreadId: "invitation-001", state: "request-received" };
    const getAll = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([proof]);
    const acceptRequest = jest.fn(async () => proof);
    const selectCredentialsForRequest = jest.fn(async () => ({
      proofFormats: {
        anoncreds: {
          attributes: {
            student_details: {
              credentialInfo: {
                attributes: {
                  studentNumber: "VOSCAL100",
                  faculty: "Commerce",
                  year: 2026,
                },
              },
            },
          },
          predicates: {},
          selfAttestedAttributes: {},
        },
      },
    }));

    __holderAgentTestInternals.setActiveHolderAgentForTest({
      didcomm: {
        oob: {
          parseInvitation: jest.fn(async () => ({ id: "invitation-001" })),
          receiveInvitationFromUrl: jest.fn(async () => ({})),
        },
        proofs: { acceptRequest, getAll, selectCredentialsForRequest },
      },
      initialize: jest.fn(),
    } as unknown as HolderAgent);

    const received = await receiveVerificationProofRequest("https://verifier.example/oob");
    const selection = await selectVerificationCredentials(received.id, [
      "studentNumber",
      "faculty",
      "year",
    ]);

    expect(selection.values).toEqual({
      studentNumber: "VOSCAL100",
      faculty: "Commerce",
      year: "2026",
    });
    expect(acceptRequest).not.toHaveBeenCalled();

    await acceptVerificationProof(selection);
    expect(acceptRequest).toHaveBeenCalledWith({
      proofExchangeRecordId: "proof-001",
      proofFormats: selection.proofFormats,
    });
  });

  it("detects a revoked credential and declines without presenting it", async () => {
    const declineRequest = jest.fn(async () => ({ id: "proof-revoked", state: "declined" }));
    const selectCredentialsForRequest = jest
      .fn()
      .mockResolvedValueOnce({ proofFormats: { anoncreds: { attributes: {} } } })
      .mockResolvedValueOnce({
        proofFormats: {
          anoncreds: {
            attributes: {
              student: {
                revoked: true,
                credentialInfo: { attributes: { studentNumber: "STU001" } },
              },
            },
          },
        },
      });

    __holderAgentTestInternals.setActiveHolderAgentForTest({
      didcomm: { proofs: { declineRequest, selectCredentialsForRequest } },
      initialize: jest.fn(),
    } as unknown as HolderAgent);

    await expect(selectVerificationCredentials("proof-revoked", ["studentNumber"]))
      .rejects.toMatchObject({ code: "CREDENTIAL_REVOKED", proofRecordId: "proof-revoked" });
    expect(selectCredentialsForRequest).toHaveBeenNthCalledWith(1, {
      proofExchangeRecordId: "proof-revoked",
      proofFormats: { anoncreds: { filterByNonRevocationRequirements: true } },
    });
    expect(selectCredentialsForRequest).toHaveBeenNthCalledWith(2, {
      proofExchangeRecordId: "proof-revoked",
      proofFormats: { anoncreds: { filterByNonRevocationRequirements: false } },
    });
    expect(declineRequest).toHaveBeenCalledWith({
      proofExchangeRecordId: "proof-revoked",
      problemReportDescription: "Credential is revoked",
      sendProblemReport: true,
    });
  });

  it("separates a revocation registry outage from a revoked credential", async () => {
    const declineRequest = jest.fn(async () => ({ id: "proof-status-outage", state: "declined" }));
    const selectCredentialsForRequest = jest
      .fn()
      .mockRejectedValueOnce(new Error("Unable to download tails file for revocation status"))
      .mockRejectedValueOnce(new Error("Revocation registry is unavailable"));

    __holderAgentTestInternals.setActiveHolderAgentForTest({
      didcomm: { proofs: { declineRequest, selectCredentialsForRequest } },
      initialize: jest.fn(),
    } as unknown as HolderAgent);

    await expect(selectVerificationCredentials("proof-status-outage", ["studentNumber"]))
      .rejects.toMatchObject({ code: "REVOCATION_CHECK_FAILED", proofRecordId: "proof-status-outage" });
    expect(declineRequest).toHaveBeenCalledWith({
      proofExchangeRecordId: "proof-status-outage",
      problemReportDescription: "Revocation status list unavailable",
      sendProblemReport: true,
    });
  });
});

describe("holder agent mediator pickup", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("starts message pickup for an existing ready mediator", async () => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    const mediation = { connectionId: "connection-1", id: "mediator-1", isReady: true };
    const initiateMessagePickup = jest.fn(async () => undefined);
    const strategy = "PickUpV2";

    await __holderAgentTestInternals.startMediatorPickup({ initiateMessagePickup }, mediation, strategy);

    expect(initiateMessagePickup).toHaveBeenCalledWith(mediation, strategy);
  });
});

describe("holder verification invitation deadline", () => {
  afterEach(() => {
    clearActiveHolderAgent();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function stalledInvitationAgent() {
    let proofListener: ((event: unknown) => void) | undefined;
    let rejectReceive: ((error: unknown) => void) | undefined;
    const on = jest.fn((_eventType: string, listener: (event: unknown) => void) => {
      proofListener = listener;
    });
    const off = jest.fn();
    const receiveInvitationFromUrl = jest.fn(
      () => new Promise<never>((_resolve, reject) => { rejectReceive = reject; }),
    );
    __holderAgentTestInternals.setActiveHolderAgentForTest({
      didcomm: {
        oob: {
          parseInvitation: jest.fn(async () => ({ id: "invitation-001" })),
          receiveInvitationFromUrl,
        },
        proofs: { getAll: jest.fn(async () => []) },
      },
      events: { on, off },
      initialize: jest.fn(),
    } as unknown as HolderAgent);
    return {
      emitProof: (proof: object) => proofListener?.({ payload: { proofRecord: proof } }),
      off,
      on,
      receiveInvitationFromUrl,
      rejectReceive: (error: unknown) => rejectReceive?.(error),
    };
  }

  it("resolves from a correlated proof event while native OOB receive stays pending", async () => {
    const agent = stalledInvitationAgent();
    const received = receiveVerificationProofRequest("https://verifier.example/oob");
    await Promise.resolve();
    await Promise.resolve();

    expect(agent.on).toHaveBeenCalledWith("DidCommProofStateChanged", expect.any(Function));
    expect(agent.on.mock.invocationCallOrder[0]).toBeLessThan(
      agent.receiveInvitationFromUrl.mock.invocationCallOrder[0],
    );
    let resolved = false;
    void received.then(() => { resolved = true; });
    agent.emitProof({
      id: "unrelated-proof",
      parentThreadId: "another-invitation",
      state: "request-received",
    });
    await Promise.resolve();
    expect(resolved).toBe(false);

    agent.emitProof({
      id: "proof-event-001",
      parentThreadId: "invitation-001",
      state: "request-received",
    });

    await expect(received).resolves.toMatchObject({ id: "proof-event-001" });
    expect(agent.off).toHaveBeenCalledWith("DidCommProofStateChanged", expect.any(Function));

    // Credo may reject its outer receive after the proof event. That rejection is handled.
    agent.rejectReceive(new Error("late OOB receive rejection"));
    await Promise.resolve();
  });

  it("discovers a stored proof when the native receive and proof event both stay pending", async () => {
    jest.useFakeTimers();
    const proof = {
      id: "proof-stored-001",
      parentThreadId: "invitation-001",
      state: "request-received",
    };
    const getAll = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValue([proof]);
    const receiveInvitationFromUrl = jest.fn(() => new Promise<never>(() => undefined));
    const off = jest.fn();
    __holderAgentTestInternals.setActiveHolderAgentForTest({
      didcomm: {
        oob: {
          parseInvitation: jest.fn(async () => ({ id: "invitation-001" })),
          receiveInvitationFromUrl,
        },
        proofs: { getAll },
      },
      events: { on: jest.fn(), off },
      initialize: jest.fn(),
    } as unknown as HolderAgent);

    const received = receiveVerificationProofRequest("https://verifier.example/oob");
    await Promise.resolve();
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(300);

    await expect(received).resolves.toMatchObject({ id: "proof-stored-001" });
    expect(getAll).toHaveBeenCalledTimes(2);
    expect(off).toHaveBeenCalledWith("DidCommProofStateChanged", expect.any(Function));
  });

  it("surfaces a prompt native receive failure when no correlated proof was stored", async () => {
    const agent = stalledInvitationAgent();
    const received = receiveVerificationProofRequest("https://verifier.example/oob");
    await Promise.resolve();
    await Promise.resolve();

    const receiveError = new Error("invalid connectionless invitation");
    agent.rejectReceive(receiveError);

    await expect(received).rejects.toBe(receiveError);
    expect(agent.off).toHaveBeenCalledWith("DidCommProofStateChanged", expect.any(Function));
  });

  it("cleans up the proof listener when a stalled invitation times out", async () => {
    jest.useFakeTimers();
    const agent = stalledInvitationAgent();
    const received = receiveVerificationProofRequest("https://verifier.example/oob");
    await Promise.resolve();
    await Promise.resolve();

    jest.advanceTimersByTime(15_000);

    await expect(received).rejects.toMatchObject({
      code: "PROOF_REQUEST_TIMEOUT",
      message: expect.stringContaining("reuse the existing verification session"),
    });
    expect(agent.off).toHaveBeenCalledWith("DidCommProofStateChanged", expect.any(Function));
  });

  it("removes proof and abort listeners when the caller cancels", async () => {
    const agent = stalledInvitationAgent();
    const controller = new AbortController();
    const removeAbortListener = jest.spyOn(controller.signal, "removeEventListener");
    const received = receiveVerificationProofRequest(
      "https://verifier.example/oob",
      controller.signal,
    );
    await Promise.resolve();
    await Promise.resolve();

    controller.abort();

    await expect(received).rejects.toMatchObject({ name: "AbortError" });
    expect(agent.off).toHaveBeenCalledWith("DidCommProofStateChanged", expect.any(Function));
    expect(removeAbortListener).toHaveBeenCalledWith("abort", expect.any(Function));
  });
});
