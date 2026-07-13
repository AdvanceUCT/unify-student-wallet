import {
  __holderAgentTestInternals,
  clearActiveHolderAgent,
  exportEncryptedHolderWallet,
  acceptVerificationProof,
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
