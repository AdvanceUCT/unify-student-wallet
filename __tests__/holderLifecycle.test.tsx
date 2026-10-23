import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { HolderAgentProvider, useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
const mockResume = jest.fn();
const mockRestore = jest.fn();
const mockClear = jest.fn();
jest.mock("@/src/features/wallet/holderAgent", () => ({ resumeHolderAgentSession: (id: string) => mockResume(id), restoreEncryptedHolderWallet: () => mockRestore(), clearActiveHolderAgent: () => mockClear() }));
let context: ReturnType<typeof useHolderAgent>;
function Capture() { context = useHolderAgent(); return <Text>{context.walletId}:{context.status}</Text>; }
it("serializes reset and restore behind an old resume and never publishes the old wallet", async () => {
  let resolve!: (value: unknown) => void;
  const shutdown = jest.fn(async () => {});
  mockResume.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  mockRestore.mockResolvedValue({ walletId: "restored", agent: { shutdown: jest.fn() } });
  const view = render(<HolderAgentProvider><Capture /></HolderAgentProvider>);
  let opening!: Promise<unknown>;
  act(() => { opening = context.resumeWallet("old").catch(() => undefined); });
  await waitFor(() => expect(mockResume).toHaveBeenCalledWith("old"));
  let reset!: Promise<void>; let restored!: Promise<unknown>;
  act(() => { reset = context.resetAgent(); restored = context.restoreWallet("/synthetic", "password"); });
  expect(mockRestore).not.toHaveBeenCalled();
  await act(async () => { resolve({ shutdown }); await opening; await reset; await restored; });
  expect(shutdown).toHaveBeenCalledTimes(1);
  expect(context.walletId).toBe("restored");
  expect(context.status).toBe("ready");
  view.unmount();
});
