import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { HolderAgentProvider, useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import type { ResolvedWalletActivation } from "@/src/features/wallet/activationResolver";

const mockHolderAgent = { id: "agent-one" };
const mockInitializeHolderAgent = jest.fn(async (_config: unknown) => mockHolderAgent);
const mockAcceptCredentialInvitation = jest.fn(async (_agent: unknown, activation: ResolvedWalletActivation) => ({
  credentialRecordId: `credential-${activation.activationId}`,
  holderAgentInitialized: true,
  holderConnectionId: `connection-${activation.invitationId}`,
}));

jest.mock("@/src/features/wallet/holderAgent", () => ({
  acceptCredentialInvitation: (agent: unknown, activation: ResolvedWalletActivation) =>
    mockAcceptCredentialInvitation(agent, activation),
  initializeHolderAgent: (config: unknown) => mockInitializeHolderAgent(config),
}));

const activation: ResolvedWalletActivation = {
  activationId: "activation-001",
  activationSource: "oob",
  createdAt: "2026-05-07T10:00:00.000Z",
  invitationId: "invitation-001",
  invitationUrl: "https://issuer.advanceuct.test/oob?oob=abc",
  issuerLabel: "UNIFY Issuer Service",
  ledgerName: "BCovrin Test",
  studentId: "student-demo-001",
  walletId: "wallet-demo-001",
};

let holderContext:
  | {
      acceptInvitation: (value: ResolvedWalletActivation) => Promise<unknown>;
      status: string;
    }
  | undefined;

function CaptureHolderAgentContext() {
  holderContext = useHolderAgent();
  return <Text>{holderContext.status}</Text>;
}

describe("HolderAgentProvider", () => {
  beforeEach(() => {
    mockAcceptCredentialInvitation.mockClear();
    mockInitializeHolderAgent.mockClear();
    holderContext = undefined;
  });

  it("initializes one holder agent per wallet and reuses it for repeated invitations", async () => {
    render(
      <HolderAgentProvider>
        <CaptureHolderAgentContext />
      </HolderAgentProvider>,
    );

    await waitFor(() => expect(holderContext).toBeDefined());

    await act(async () => {
      await holderContext?.acceptInvitation(activation);
      await holderContext?.acceptInvitation({
        ...activation,
        activationId: "activation-002",
        invitationId: "invitation-002",
        invitationUrl: "https://issuer.advanceuct.test/oob?oob=def",
      });
    });

    expect(mockInitializeHolderAgent).toHaveBeenCalledTimes(1);
    expect(mockInitializeHolderAgent).toHaveBeenCalledWith({
      mediatorInvitationUrl: undefined,
      walletId: "wallet-demo-001",
    });
    expect(mockAcceptCredentialInvitation).toHaveBeenCalledTimes(2);
    expect(mockAcceptCredentialInvitation).toHaveBeenNthCalledWith(1, mockHolderAgent, activation);
    expect(mockAcceptCredentialInvitation).toHaveBeenNthCalledWith(
      2,
      mockHolderAgent,
      expect.objectContaining({ activationId: "activation-002" }),
    );
  });
});
