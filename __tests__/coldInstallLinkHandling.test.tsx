import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { HolderAgentProvider } from "@/src/features/wallet/HolderAgentProvider";
import {
  useWalletSession,
  WalletSessionProvider,
} from "@/src/features/wallet/WalletSessionProvider";

const mockSecureValues = new Map<string, string>();
const mockHolderAgent = { id: "holder-agent-001" };
const mockReceiveCredentialOffer = jest.fn(async (_url: string) => undefined);
const originalFetch = global.fetch;

jest.mock("@/src/lib/storage/secureStore", () => ({
  deleteSecureValue: jest.fn(async (key: string) => {
    mockSecureValues.delete(key);
  }),
  getSecureValue: jest.fn(async (key: string) => mockSecureValues.get(key) ?? null),
  saveSecureValue: jest.fn(async (key: string, value: string) => {
    mockSecureValues.set(key, value);
  }),
}));

jest.mock("@/src/features/wallet/holderAgent", () => ({
  acceptCredentialOffer: jest.fn(async () => undefined),
  clearActiveHolderAgent: jest.fn(),
  createLocalHolderWallet: jest.fn(async () => ({ walletId: "wallet-uuid-001", agent: mockHolderAgent })),
  declineCredentialOffer: jest.fn(async () => undefined),
  getActiveHolderAgent: () => mockHolderAgent,
  getActiveWalletId: () => "wallet-uuid-001",
  getCredentialRecord: jest.fn(async () => null),
  initializeHolderAgent: jest.fn(async () => mockHolderAgent),
  receiveCredentialOffer: (url: string) => mockReceiveCredentialOffer(url),
  resumeHolderAgentSession: jest.fn(async () => mockHolderAgent),
  subscribeToOfferReceived: jest.fn(() => () => undefined),
}));

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => `hash:${value}`),
  randomUUID: jest.fn(() => "wallet-uuid-001"),
}));

jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn(async () => false),
  isEnrolledAsync: jest.fn(async () => false),
}));

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useSegments: jest.fn(() => ["(auth)", "set-pin"]),
}));

let walletContext:
  | {
      createWallet: (pin: string, confirmation: string) => Promise<{ ok: true } | { ok: false; error: string }>;
      processIncomingLink: (url: string) => Promise<{ ok: true } | { ok: false; error: string }>;
      stashedActivationUrl?: string;
      isHydrated: boolean;
    }
  | undefined;

function CaptureWalletContext() {
  walletContext = useWalletSession() as typeof walletContext;
  return <Text>{walletContext?.stashedActivationUrl ?? "no-stash"}</Text>;
}

describe("cold install link handling", () => {
  beforeEach(() => {
    mockReceiveCredentialOffer.mockClear();
    mockSecureValues.clear();
    walletContext = undefined;
    process.env.EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL = "http://localhost:3001";
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn(async () => ({
        activationId: "activation-cold-1",
        activationSource: "token",
        createdAt: "2026-04-27T10:00:00.000Z",
        invitationId: "unify-oob-cold",
        invitationUrl: "https://issuer.advanceuct.test/oob?oob=cold",
        issuerLabel: "UNIFY Issuer Service",
      })),
      ok: true,
      status: 200,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.EXPO_PUBLIC_UNIFY_AGENT_API_BASE_URL;
  });

  it("stashes the activation link before wallet exists and replays it after createWallet", async () => {
    render(
      <HolderAgentProvider>
        <WalletSessionProvider>
          <CaptureWalletContext />
        </WalletSessionProvider>
      </HolderAgentProvider>,
    );

    await waitFor(() => expect(walletContext?.isHydrated).toBe(true));

    await act(async () => {
      const result = await walletContext?.processIncomingLink("unifywallet://activate?token=cold-token");
      expect(result).toMatchObject({ ok: true });
    });

    expect(walletContext?.stashedActivationUrl).toBe("unifywallet://activate?token=cold-token");
    expect(mockReceiveCredentialOffer).not.toHaveBeenCalled();

    await act(async () => {
      const result = await walletContext?.createWallet("2468", "2468");
      expect(result).toEqual({ ok: true });
    });

    await waitFor(() =>
      expect(mockReceiveCredentialOffer).toHaveBeenCalledWith("https://issuer.advanceuct.test/oob?oob=cold"),
    );
    await waitFor(() => expect(walletContext?.stashedActivationUrl).toBeUndefined());
  });
});
