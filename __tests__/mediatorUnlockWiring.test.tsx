import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { useWalletSession, WalletSessionProvider } from "@/src/features/wallet/WalletSessionProvider";
import type { WalletSession } from "@/src/features/wallet/sessionTypes";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockResumeHolderAgentSession = jest.fn(async () => undefined);

jest.mock("@/src/features/wallet/holderAgent", () => ({
  acceptHolderActivation: jest.fn(async () => ({
    credentialRecordId: "cred-001",
    holderAgentInitialized: false,
    holderConnectionId: "conn-001",
    mediatorConnectionId: "mediator-conn-001",
  })),
  resumeHolderAgentSession: (...args: unknown[]) => mockResumeHolderAgentSession(...args),
}));

jest.mock("expo-local-authentication", () => ({
  authenticateAsync: jest.fn(async () => ({ success: true })),
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
}));

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
  useSegments: jest.fn(() => ["(wallet)", "home"]),
}));

// PIN material pre-computed for PIN "123456" with salt "test-salt".
// verifyPin is mocked to accept this combination so tests stay deterministic.
jest.mock("@/src/features/wallet/pin", () => ({
  createPinSalt: jest.fn(() => "test-salt"),
  hashPin: jest.fn(async () => "test-hash"),
  validateNewPin: jest.fn(() => ({ ok: true })),
  validatePinConfirmation: jest.fn(() => ({ ok: true })),
  verifyPin: jest.fn(async () => true),
}));

// ---------------------------------------------------------------------------
// Shared store state
// ---------------------------------------------------------------------------

const mockStore = new Map<string, string>();

// Pre-activated, locked session — this is what the wallet looks like after the
// user has completed first-time activation and then closed the app.
const activatedLockedState = JSON.stringify({
  biometricEnabled: false,
  changePinAttempts: 0,
  failedAttempts: 0,
  pinHash: "test-hash",
  pinSalt: "test-salt",
  session: {
    authStatus: "signedIn",
    activationStatus: "activated",
    lockStatus: "locked",
    walletId: "wallet-demo-001",
    studentId: "student-demo-001",
    mediatorConnectionId: "mediator-conn-001",
  } satisfies Partial<WalletSession>,
});

jest.mock("@/src/lib/storage/secureStore", () => ({
  deleteSecureValue: jest.fn(async (key: string) => { mockStore.delete(key); }),
  getSecureValue: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  saveSecureValue: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
}));

// ---------------------------------------------------------------------------
// Test harness component
// ---------------------------------------------------------------------------

let walletCtx: ReturnType<typeof useWalletSession> | undefined;

function CaptureContext() {
  walletCtx = useWalletSession();
  return <Text>{walletCtx.isHydrated ? walletCtx.session.lockStatus : "hydrating"}</Text>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("mediator agent resume on wallet unlock", () => {
  beforeEach(() => {
    mockStore.clear();
    mockStore.set("unify.wallet.session.v1", activatedLockedState);
    mockResumeHolderAgentSession.mockClear();
    walletCtx = undefined;
  });

  async function renderAndHydrate() {
    const utils = render(
      <WalletSessionProvider>
        <CaptureContext />
      </WalletSessionProvider>,
    );
    await waitFor(() => expect(walletCtx?.isHydrated).toBe(true));
    return utils;
  }

  it("calls resumeHolderAgentSession with the wallet ID after a correct PIN unlock", async () => {
    await renderAndHydrate();

    await act(async () => {
      await walletCtx!.unlockWithPin("123456");
    });

    expect(mockResumeHolderAgentSession).toHaveBeenCalledTimes(1);
    expect(mockResumeHolderAgentSession).toHaveBeenCalledWith("wallet-demo-001");
  });

  it("calls resumeHolderAgentSession after a successful biometric unlock", async () => {
    await renderAndHydrate();

    await act(async () => {
      const biometricState = JSON.stringify({
        ...JSON.parse(activatedLockedState),
        biometricEnabled: true,
      });
      mockStore.set("unify.wallet.session.v1", biometricState);

      // Re-hydrate with biometric enabled
      walletCtx = undefined;
    });

    // Re-render with biometric session
    render(
      <WalletSessionProvider>
        <CaptureContext />
      </WalletSessionProvider>,
    );
    await waitFor(() => expect(walletCtx?.isHydrated).toBe(true));

    mockResumeHolderAgentSession.mockClear();

    await act(async () => {
      await walletCtx!.unlockWithBiometric();
    });

    expect(mockResumeHolderAgentSession).toHaveBeenCalledTimes(1);
    expect(mockResumeHolderAgentSession).toHaveBeenCalledWith("wallet-demo-001");
  });

  it("does NOT call resumeHolderAgentSession when the wallet is not yet activated", async () => {
    const notActivatedState = JSON.stringify({
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      pinHash: "test-hash",
      pinSalt: "test-salt",
      session: {
        authStatus: "signedIn",
        activationStatus: "notActivated",
        lockStatus: "locked",
      } satisfies Partial<WalletSession>,
    });
    mockStore.set("unify.wallet.session.v1", notActivatedState);

    await renderAndHydrate();

    await act(async () => {
      await walletCtx!.unlockWithPin("123456");
    });

    expect(mockResumeHolderAgentSession).not.toHaveBeenCalled();
  });

  it("does NOT call resumeHolderAgentSession when walletId is missing", async () => {
    const noWalletIdState = JSON.stringify({
      biometricEnabled: false,
      changePinAttempts: 0,
      failedAttempts: 0,
      pinHash: "test-hash",
      pinSalt: "test-salt",
      session: {
        authStatus: "signedIn",
        activationStatus: "activated",
        lockStatus: "locked",
        // walletId deliberately absent
      } satisfies Partial<WalletSession>,
    });
    mockStore.set("unify.wallet.session.v1", noWalletIdState);

    await renderAndHydrate();

    await act(async () => {
      await walletCtx!.unlockWithPin("123456");
    });

    expect(mockResumeHolderAgentSession).not.toHaveBeenCalled();
  });
});
