import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  useWalletSession,
  WalletSessionProvider,
} from "@/src/features/wallet/WalletSessionProvider";
import { HolderAgentProvider } from "@/src/features/wallet/HolderAgentProvider";
import type { WalletSession } from "@/src/features/wallet/sessionTypes";

const mockSecureValues = new Map<string, string>();
const mockHolderAgent = { id: "holder-agent-001" };
const mockCreateLocalHolderWallet = jest.fn(async () => ({ walletId: "wallet-uuid-001", agent: mockHolderAgent }));
const mockResumeHolderAgentSession = jest.fn(async (_walletId: string) => mockHolderAgent);
const mockRestoreEncryptedHolderWallet = jest.fn(async (_path: string, _password: string) => ({
  walletId: "wallet-restored-001",
  agent: mockHolderAgent,
}));
const mockReceiveCredentialOffer = jest.fn(async (_url: string) => undefined);
const mockSubscribeToOfferReceived = jest.fn((_handler: (record: { id: string }) => void) => () => undefined);

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
  createLocalHolderWallet: () => mockCreateLocalHolderWallet(),
  declineCredentialOffer: jest.fn(async () => undefined),
  getActiveHolderAgent: () => mockHolderAgent,
  getActiveWalletId: () => "wallet-uuid-001",
  getCredentialRecord: jest.fn(async () => null),
  initializeHolderAgent: jest.fn(async () => mockHolderAgent),
  receiveCredentialOffer: (url: string) => mockReceiveCredentialOffer(url),
  restoreEncryptedHolderWallet: (path: string, password: string) =>
    mockRestoreEncryptedHolderWallet(path, password),
  resumeHolderAgentSession: (walletId: string) => mockResumeHolderAgentSession(walletId),
  subscribeToOfferReceived: (handler: unknown) => mockSubscribeToOfferReceived(handler as () => void),
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
  router: { replace: jest.fn() },
  useSegments: jest.fn(() => ["(auth)", "set-pin"]),
}));

let walletContext:
  | {
      createWallet: (pin: string, confirmation: string) => Promise<{ ok: true } | { ok: false; error: string }>;
      firstRunSetupStatus: "idle" | "preparing" | "creating" | "ready" | "error";
      restoreWallet: (path: string, recoveryPassword: string) => Promise<{ ok: true } | { ok: false; error: string }>;
      retryFirstRunSetup: () => Promise<{ ok: true } | { ok: false; error: string }>;
      startFirstRunSetup: (pin: string, confirmation: string) => { ok: true } | { ok: false; error: string };
      unlockWithPin: (pin: string) => Promise<{ ok: true } | { ok: false; error: string }>;
      hasPin: boolean;
      isHydrated: boolean;
      onboardingCompleted: boolean;
      session: WalletSession;
      signOut: () => Promise<void>;
    }
  | undefined;

function CaptureWalletContext() {
  const wallet = useWalletSession();
  walletContext = wallet as typeof walletContext;

  return <Text>{wallet.isHydrated ? (wallet.session.walletId ?? "no-wallet") : "hydrating"}</Text>;
}

describe("wallet creation flow", () => {
  beforeEach(() => {
    mockCreateLocalHolderWallet.mockClear();
    mockResumeHolderAgentSession.mockClear();
    mockRestoreEncryptedHolderWallet.mockClear();
    mockReceiveCredentialOffer.mockClear();
    mockSubscribeToOfferReceived.mockClear();
    mockSecureValues.clear();
    walletContext = undefined;
  });

  it("creates the holder wallet on PIN setup and persists only safe metadata", async () => {
    render(
      <HolderAgentProvider>
        <WalletSessionProvider>
          <CaptureWalletContext />
        </WalletSessionProvider>
      </HolderAgentProvider>,
    );

    await waitFor(() => expect(walletContext).toBeDefined());
    await waitFor(() => expect(walletContext?.isHydrated).toBe(true));
    expect(walletContext?.session.walletId).toBeUndefined();

    await act(async () => {
      const result = await walletContext?.createWallet("2468", "2468");
      expect(result).toEqual({ ok: true });
    });

    await waitFor(() => expect(walletContext?.session.walletId).toBe("wallet-uuid-001"));
    await waitFor(() => expect(walletContext?.hasPin).toBe(true));

    expect(mockCreateLocalHolderWallet).toHaveBeenCalledTimes(1);
    expect(walletContext?.session.lockStatus).toBe("unlocked");
    expect(walletContext?.session.pendingOfferIds).toEqual([]);
    expect(walletContext?.onboardingCompleted).toBe(false);

    const persistedValues = Array.from(mockSecureValues.values()).join("\n");
    expect(persistedValues).not.toContain("raw-secret-token");
    expect(persistedValues).not.toContain("https://issuer.advanceuct.test/oob");
  });

  it("clears wallet session and private verification activity on sign-out", async () => {
    mockSecureValues.set("unify.wallet.session.v1", JSON.stringify({
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      onboardingCompleted: true,
      session: { authStatus: "signedIn", lockStatus: "unlocked", pendingOfferIds: [], walletId: "wallet-uuid-001" },
    }));
    mockSecureValues.set("unify.verification.activity.v1", "private activity");

    render(
      <HolderAgentProvider>
        <WalletSessionProvider>
          <CaptureWalletContext />
        </WalletSessionProvider>
      </HolderAgentProvider>,
    );
    await waitFor(() => expect(walletContext?.isHydrated).toBe(true));

    await act(async () => {
      await walletContext?.signOut();
    });

    expect(mockSecureValues.has("unify.wallet.session.v1")).toBe(false);
    expect(mockSecureValues.has("unify.verification.activity.v1")).toBe(false);
  });

  it("keeps first-run setup transient while Credo creates the wallet in the background", async () => {
    let resolveWallet!: (value: { walletId: string; agent: typeof mockHolderAgent }) => void;
    mockCreateLocalHolderWallet.mockReturnValueOnce(new Promise((resolve) => {
      resolveWallet = resolve;
    }));

    render(
      <HolderAgentProvider>
        <WalletSessionProvider>
          <CaptureWalletContext />
        </WalletSessionProvider>
      </HolderAgentProvider>,
    );

    await waitFor(() => expect(walletContext?.isHydrated).toBe(true));

    act(() => {
      expect(walletContext?.startFirstRunSetup("2468", "2468")).toEqual({ ok: true });
    });

    await waitFor(() => expect(walletContext?.firstRunSetupStatus).toBe("creating"));
    expect(walletContext?.session.walletId).toBeUndefined();

    resolveWallet({ walletId: "wallet-uuid-001", agent: mockHolderAgent });

    await waitFor(() => expect(walletContext?.firstRunSetupStatus).toBe("ready"));
    expect(walletContext?.session.walletId).toBe("wallet-uuid-001");
    expect(walletContext?.onboardingCompleted).toBe(false);
  });

  it("retries failed first-run setup without creating another wallet after readiness", async () => {
    mockCreateLocalHolderWallet
      .mockRejectedValueOnce(new Error("Credo unavailable"))
      .mockResolvedValueOnce({ walletId: "wallet-uuid-001", agent: mockHolderAgent });

    render(
      <HolderAgentProvider>
        <WalletSessionProvider>
          <CaptureWalletContext />
        </WalletSessionProvider>
      </HolderAgentProvider>,
    );

    await waitFor(() => expect(walletContext?.isHydrated).toBe(true));
    act(() => {
      expect(walletContext?.startFirstRunSetup("2468", "2468")).toEqual({ ok: true });
    });
    await waitFor(() => expect(walletContext?.firstRunSetupStatus).toBe("error"));

    await act(async () => {
      expect(await walletContext?.retryFirstRunSetup()).toEqual({ ok: true });
    });
    expect(mockCreateLocalHolderWallet).toHaveBeenCalledTimes(2);

    await act(async () => {
      expect(await walletContext?.retryFirstRunSetup()).toEqual({ ok: true });
    });
    expect(mockCreateLocalHolderWallet).toHaveBeenCalledTimes(2);
  });

  it("unlocks before the returning Credo session finishes resuming", async () => {
    mockSecureValues.set("unify.wallet.session.v1", JSON.stringify({
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      onboardingCompleted: true,
      pinHash: "hash:salt-1:2468",
      pinSalt: "salt-1",
      session: {
        authStatus: "signedIn",
        lockStatus: "locked",
        pendingOfferIds: [],
        walletId: "wallet-uuid-001",
      },
    }));
    let resolveResume!: (agent: typeof mockHolderAgent) => void;
    mockResumeHolderAgentSession.mockReturnValueOnce(new Promise((resolve) => {
      resolveResume = resolve;
    }));

    render(
      <HolderAgentProvider>
        <WalletSessionProvider>
          <CaptureWalletContext />
        </WalletSessionProvider>
      </HolderAgentProvider>,
    );
    await waitFor(() => expect(walletContext?.isHydrated).toBe(true));

    await act(async () => {
      expect(await walletContext?.unlockWithPin("2468")).toEqual({ ok: true });
    });

    expect(walletContext?.session.lockStatus).toBe("unlocked");
    expect(mockResumeHolderAgentSession).toHaveBeenCalledWith("wallet-uuid-001");
    await act(async () => {
      resolveResume(mockHolderAgent);
      await Promise.resolve();
    });
  });

  it("rejects mismatched PIN entries without creating a wallet", async () => {
    render(
      <HolderAgentProvider>
        <WalletSessionProvider>
          <CaptureWalletContext />
        </WalletSessionProvider>
      </HolderAgentProvider>,
    );

    await waitFor(() => expect(walletContext?.isHydrated).toBe(true));

    await act(async () => {
      const result = await walletContext?.createWallet("1234", "5678");
      expect(result).toEqual({ ok: false, error: "PIN entries do not match." });
    });

    expect(mockCreateLocalHolderWallet).not.toHaveBeenCalled();
    expect(walletContext?.session.walletId).toBeUndefined();
  });

  it("restores an encrypted store and sets a new PIN without replacing it", async () => {
    render(
      <HolderAgentProvider>
        <WalletSessionProvider>
          <CaptureWalletContext />
        </WalletSessionProvider>
      </HolderAgentProvider>,
    );

    await waitFor(() => expect(walletContext?.isHydrated).toBe(true));

    await act(async () => {
      expect(await walletContext?.restoreWallet("/cache/backup.unifywallet", "long-recovery-password")).toEqual({
        ok: true,
      });
    });

    expect(mockRestoreEncryptedHolderWallet).toHaveBeenCalledWith(
      "/cache/backup.unifywallet",
      "long-recovery-password",
    );
    expect(walletContext?.session.walletId).toBe("wallet-restored-001");
    expect(walletContext?.hasPin).toBe(false);

    await act(async () => {
      expect(await walletContext?.createWallet("2468", "2468")).toEqual({ ok: true });
    });

    expect(mockCreateLocalHolderWallet).not.toHaveBeenCalled();
    expect(walletContext?.hasPin).toBe(true);
    expect(walletContext?.onboardingCompleted).toBe(true);
  });
});
