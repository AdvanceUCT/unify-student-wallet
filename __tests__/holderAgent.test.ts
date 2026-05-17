import {
  __holderAgentTestInternals,
  clearActiveHolderAgent,
  receiveCredentialOffer,
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
