import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  useWalletSession,
  WalletSessionProvider,
} from "@/src/features/wallet/WalletSessionProvider";
import type { WalletSession } from "@/src/features/wallet/sessionTypes";

const mockSecureValues = new Map<string, string>();
const mockAcceptHolderActivation = jest.fn(async (_activation: unknown) => ({
  credentialRecordId: "credential-record-001",
  holderAgentInitialized: true,
  holderConnectionId: "connection-001",
}));

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
  acceptHolderActivation: (activation: unknown) => mockAcceptHolderActivation(activation),
}));

jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn(async () => false),
  isEnrolledAsync: jest.fn(async () => false),
}));

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
  useSegments: jest.fn(() => ["(auth)", "activate"]),
}));

let walletContext:
  | {
      prepareActivationFromLink: (url: string) => Promise<{ ok: true } | { ok: false; error: string }>;
      session: WalletSession;
      setPin: (pin: string, confirmation: string) => Promise<{ ok: true } | { ok: false; error: string }>;
      signInDemo: () => Promise<void>;
    }
  | undefined;

function CaptureWalletContext() {
  const wallet = useWalletSession();
  walletContext = wallet;

  return <Text>{wallet.isHydrated ? wallet.session.activationStatus : "hydrating"}</Text>;
}

describe("wallet activation flow", () => {
  beforeEach(() => {
    mockAcceptHolderActivation.mockClear();
    mockSecureValues.clear();
    walletContext = undefined;
  });

  it("resolves activation links, requires PIN setup, and stores only safe activation metadata", async () => {
    render(
      <WalletSessionProvider>
        <CaptureWalletContext />
      </WalletSessionProvider>,
    );

    await waitFor(() => expect(walletContext).toBeDefined());
    await waitFor(() => expect(walletContext?.session.authStatus).toBe("signedOut"));

    await act(async () => {
      await walletContext?.signInDemo();
    });

    await act(async () => {
      const result = await walletContext?.prepareActivationFromLink("unifywallet://activate?token=raw-secret-token");
      expect(result).toEqual({ ok: true });
    });

    await waitFor(() => expect(walletContext?.session.activationStatus).toBe("activationPending"));
    expect(mockAcceptHolderActivation).not.toHaveBeenCalled();

    await act(async () => {
      const result = await walletContext?.setPin("1234", "1234");
      expect(result).toEqual({ ok: true });
    });

    await waitFor(() => expect(walletContext?.session.activationStatus).toBe("activated"));
    expect(walletContext?.session.credentialRecordId).toBe("credential-record-001");
    expect(walletContext?.session.holderConnectionId).toBe("connection-001");
    expect(mockAcceptHolderActivation).toHaveBeenCalledTimes(1);

    const persistedValues = Array.from(mockSecureValues.values()).join("\n");
    expect(persistedValues).not.toContain("raw-secret-token");
    expect(persistedValues).not.toContain("https://issuer.advanceuct.test/oob");
    expect(persistedValues).not.toContain("credentialSubject");
  });
});
