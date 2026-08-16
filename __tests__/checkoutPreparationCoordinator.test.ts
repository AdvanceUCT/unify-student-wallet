import {
  acquireCheckoutPreparation,
  checkoutPreparationKey,
  clearAllCheckoutPreparationsForTests,
} from "@/src/features/verification/checkoutPreparationCoordinator";

const result = {
  sessionInfo: {
    verificationRequestId: "verification-001",
    invitationUrl: "https://agent.example/oob/verification-001",
    resultToken: "result-capability",
    vendorName: "Campus Store",
    servicePointName: "Online checkout",
    requestedAttributes: ["studentNumber"],
    expiresAt: "2026-08-16T12:05:00.000Z",
  },
  selection: {
    proofRecordId: "proof-001",
    proofFormats: { anoncreds: {} },
    values: { studentNumber: "STU001" },
  },
};

describe("checkout preparation coordinator", () => {
  beforeEach(clearAllCheckoutPreparationsForTests);

  it("shares work and progress while subscribers remain mounted", async () => {
    let finish!: () => void;
    const prepare = jest.fn(async ({ setProgress }: { setProgress: (progress: "receiving-request") => void }) => {
      setProgress("receiving-request");
      await new Promise<void>((resolve) => { finish = resolve; });
      return result;
    });
    const firstProgress = jest.fn();
    const secondProgress = jest.fn();
    const key = checkoutPreparationKey("wallet-001", "verification-001");

    const first = acquireCheckoutPreparation({ key, onProgress: firstProgress, prepare });
    const second = acquireCheckoutPreparation({ key, onProgress: secondProgress, prepare });

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(secondProgress).toHaveBeenCalledWith("receiving-request");
    first.release();
    finish();

    await expect(first.promise).resolves.toEqual(result);
    await expect(second.promise).resolves.toEqual(result);
    second.release();
  });

  it("aborts only after the last active subscriber releases", () => {
    let signal!: AbortSignal;
    const prepare = jest.fn(({ signal: activeSignal }: { signal: AbortSignal }) => {
      signal = activeSignal;
      return new Promise<typeof result>(() => undefined);
    });
    const key = checkoutPreparationKey("wallet-001", "verification-002");
    const first = acquireCheckoutPreparation({ key, onProgress: jest.fn(), prepare });
    const second = acquireCheckoutPreparation({ key, onProgress: jest.fn(), prepare });

    first.release();
    expect(signal.aborted).toBe(false);
    second.release();
    expect(signal.aborted).toBe(true);
  });
});
