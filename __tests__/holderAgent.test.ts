import {
  __holderAgentTestInternals,
  clearActiveHolderAgent,
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
