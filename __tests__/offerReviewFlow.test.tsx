import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { HolderAgentProvider } from "@/src/features/wallet/HolderAgentProvider";
import {
  useWalletSession,
  WalletSessionProvider,
} from "@/src/features/wallet/WalletSessionProvider";

const mockSecureValues = new Map<string, string>();
const mockHolderAgent = { id: "holder-agent-001" };
const mockAcceptCredentialOffer = jest.fn(async (_id: string) => undefined);
const mockDeclineCredentialOffer = jest.fn(async (_id: string) => undefined);
const mockReceiveCredentialOffer = jest.fn(async (_url: string) => undefined);

let storedOfferReceivedHandler: ((record: { id: string; state?: string }) => void) | null = null;

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
  acceptCredentialOffer: (id: string) => mockAcceptCredentialOffer(id),
  clearActiveHolderAgent: jest.fn(),
  createLocalHolderWallet: jest.fn(async () => ({ walletId: "wallet-uuid-001", agent: mockHolderAgent })),
  declineCredentialOffer: (id: string) => mockDeclineCredentialOffer(id),
  getActiveHolderAgent: () => mockHolderAgent,
  getActiveWalletId: () => "wallet-uuid-001",
  getCredentialRecord: jest.fn(async () => null),
  initializeHolderAgent: jest.fn(async () => mockHolderAgent),
  receiveCredentialOffer: (url: string) => mockReceiveCredentialOffer(url),
  resumeHolderAgentSession: jest.fn(async () => mockHolderAgent),
  subscribeToOfferReceived: jest.fn((handler: (record: { id: string; state?: string }) => void) => {
    storedOfferReceivedHandler = handler;
    return () => {
      storedOfferReceivedHandler = null;
    };
  }),
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
  useSegments: jest.fn(() => ["(wallet)", "home"]),
}));

let walletContext:
  | {
      createWallet: (pin: string, confirmation: string) => Promise<{ ok: true } | { ok: false; error: string }>;
      acceptOffer: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
      declineOffer: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
      pendingOfferIds: string[];
      isHydrated: boolean;
    }
  | undefined;

function CaptureWalletContext() {
  walletContext = useWalletSession() as typeof walletContext;
  return <Text>{walletContext?.isHydrated ? "ready" : "hydrating"}</Text>;
}

describe("offer review flow", () => {
  beforeEach(() => {
    mockAcceptCredentialOffer.mockClear();
    mockDeclineCredentialOffer.mockClear();
    mockReceiveCredentialOffer.mockClear();
    mockSecureValues.clear();
    storedOfferReceivedHandler = null;
    walletContext = undefined;
  });

  it("captures incoming offers, surfaces them as pending, and clears them on accept", async () => {
    render(
      <HolderAgentProvider>
        <WalletSessionProvider>
          <CaptureWalletContext />
        </WalletSessionProvider>
      </HolderAgentProvider>,
    );

    await waitFor(() => expect(walletContext?.isHydrated).toBe(true));

    await act(async () => {
      await walletContext?.createWallet("2468", "2468");
    });

    await waitFor(() => expect(storedOfferReceivedHandler).not.toBeNull());

    await act(async () => {
    storedOfferReceivedHandler?.({ id: "offer-1", state: "offer-received" });
    });

    await waitFor(() => expect(walletContext?.pendingOfferIds).toEqual(["offer-1"]));

    await act(async () => {
      const result = await walletContext?.acceptOffer("offer-1");
      expect(result).toEqual({ ok: true });
    });

    expect(mockAcceptCredentialOffer).toHaveBeenCalledWith("offer-1");
    await waitFor(() => expect(walletContext?.pendingOfferIds).toEqual([]));
  });

  it("removes offers when the user declines, without accepting them", async () => {
    render(
      <HolderAgentProvider>
        <WalletSessionProvider>
          <CaptureWalletContext />
        </WalletSessionProvider>
      </HolderAgentProvider>,
    );

    await waitFor(() => expect(walletContext?.isHydrated).toBe(true));

    await act(async () => {
      await walletContext?.createWallet("2468", "2468");
    });

    await act(async () => {
      storedOfferReceivedHandler?.({ id: "offer-2", state: "offer-received" });
    });

    await waitFor(() => expect(walletContext?.pendingOfferIds).toEqual(["offer-2"]));

    await act(async () => {
      const result = await walletContext?.declineOffer("offer-2");
      expect(result).toEqual({ ok: true });
    });

    expect(mockDeclineCredentialOffer).toHaveBeenCalledWith("offer-2");
    expect(mockAcceptCredentialOffer).not.toHaveBeenCalled();
    await waitFor(() => expect(walletContext?.pendingOfferIds).toEqual([]));
  });
});
