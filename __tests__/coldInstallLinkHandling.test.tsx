import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { HolderAgentProvider } from "@/src/features/wallet/HolderAgentProvider";
import {
  useWalletSession,
  WalletRouteGate,
  WalletSessionProvider,
} from "@/src/features/wallet/WalletSessionProvider";

const mockSecureValues = new Map<string, string>();
const mockHolderAgent = { id: "holder-agent-001" };
const mockReceiveCredentialOffer = jest.fn(async (_url: string) => ({ id: "credential-cold-1", state: "credential-received" }));
const originalFetch = global.fetch;
const mockReplace = jest.fn();
let mockSegments = ["(auth)", "set-pin"];
let mockLinkListener: ((event: { url: string }) => void) | undefined;

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

jest.mock("expo-linking", () => ({
  addEventListener: jest.fn((_event: string, listener: (event: { url: string }) => void) => {
    mockLinkListener = listener;
    return { remove: jest.fn() };
  }),
  getInitialURL: jest.fn(async () => null),
}));

jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args), push: jest.fn() },
  useSegments: jest.fn(() => mockSegments),
}));

let walletContext:
  | {
      createWallet: (pin: string, confirmation: string) => Promise<{ ok: true } | { ok: false; error: string }>;
      completeOnboarding: () => Promise<void>;
      clearPendingFlow: (kind: "checkout" | "servicePoint" | "activation" | "offer") => Promise<void>;
      continuePendingFlow: () => Promise<{ ok: boolean; kind: string; href?: string; error?: string }>;
      processIncomingLink: (url: string) => Promise<{ ok: true } | { ok: false; error: string }>;
      pendingActivationUrl?: string;
      pendingCheckoutVerification?: { verificationRequestId: string; claimToken: string };
      isHydrated: boolean;
      onboardingCompleted: boolean;
      setPendingCheckoutVerification: (value?: { verificationRequestId: string; claimToken: string }) => Promise<void>;
      setPendingVerificationPublicServicePointId: (value?: string) => Promise<void>;
    }
  | undefined;

function CaptureWalletContext() {
  walletContext = useWalletSession() as typeof walletContext;
  return <Text>{walletContext?.pendingActivationUrl ?? "no-stash"}</Text>;
}

describe("cold install link handling", () => {
  beforeEach(() => {
    mockReceiveCredentialOffer.mockClear();
    mockReplace.mockClear();
    mockSegments = ["(auth)", "set-pin"];
    mockLinkListener = undefined;
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

  it("persists activation through wallet creation and resumes it after onboarding", async () => {
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

    expect(walletContext?.pendingActivationUrl).toBe("unifywallet://activate?token=cold-token");
    expect(Array.from(mockSecureValues.values()).join("\n")).toContain("unifywallet://activate?token=cold-token");
    expect(mockReceiveCredentialOffer).not.toHaveBeenCalled();

    await act(async () => {
      const result = await walletContext?.createWallet("2468", "2468");
      expect(result).toEqual({ ok: true });
    });

    expect(walletContext?.onboardingCompleted).toBe(false);
    expect(mockReceiveCredentialOffer).not.toHaveBeenCalled();

    await act(async () => {
      await walletContext?.completeOnboarding();
      expect(await walletContext?.continuePendingFlow()).toMatchObject({
        ok: true,
        kind: "activation",
        href: "/(wallet)/credential",
      });
    });

    expect(mockReceiveCredentialOffer).toHaveBeenCalledWith("https://issuer.advanceuct.test/oob?oob=cold");
    expect(walletContext?.pendingActivationUrl).toBeUndefined();
  });

  it("continues checkout before service-point verification and clears only the selected flow", async () => {
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
      await walletContext?.completeOnboarding();
      await walletContext?.setPendingVerificationPublicServicePointId("service-point-1");
      await walletContext?.setPendingCheckoutVerification({ verificationRequestId: "checkout-1", claimToken: "claim-1" });
    });

    await act(async () => {
      expect(await walletContext?.continuePendingFlow()).toMatchObject({ ok: true, kind: "checkout" });
      await walletContext?.clearPendingFlow("checkout");
      expect(await walletContext?.continuePendingFlow()).toEqual({
        ok: true,
        kind: "servicePoint",
        href: "/verify/service-point-1",
      });
    });
  });

  it("does not create a competing checkout route for an unlocked Expo App Link", async () => {
    render(
      <HolderAgentProvider>
        <WalletSessionProvider>
          <WalletRouteGate>
            <CaptureWalletContext />
          </WalletRouteGate>
        </WalletSessionProvider>
      </HolderAgentProvider>,
    );

    await waitFor(() => expect(walletContext?.isHydrated).toBe(true));
    await act(async () => {
      await walletContext?.createWallet("2468", "2468");
      await walletContext?.completeOnboarding();
    });
    mockSegments = ["(wallet)", "home"];
    mockReplace.mockClear();

    await act(async () => {
      mockLinkListener?.({
        url: `https://voskuils.com/verify/checkout/checkout-1?token=${"a".repeat(43)}`,
      });
      await Promise.resolve();
    });

    expect(walletContext?.pendingCheckoutVerification).toBeUndefined();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
