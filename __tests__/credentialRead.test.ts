import { boundedCredentialRead } from "@/src/features/wallet/credentialRead";
afterEach(() => jest.useRealTimers());
it("ends loading at fifteen seconds and ignores a late result after retry", async () => {
  jest.useFakeTimers();
  let release!: (value: string[]) => void;
  const native = new Promise<string[]>(done => { release = done; });
  const result = boundedCredentialRead(native, 15000, "synthetic read");
  let outcome = "pending";
  void result.then(() => { outcome = "success"; }, () => { outcome = "timeout"; });
  await jest.advanceTimersByTimeAsync(14999);
  expect(outcome).toBe("pending");
  await jest.advanceTimersByTimeAsync(1);
  expect(outcome).toBe("timeout");
  await expect(boundedCredentialRead(Promise.resolve(["current"]), 15000, "retry")).resolves.toEqual(["current"]);
  release(["old"]);
  await Promise.resolve();
  expect(outcome).toBe("timeout");
});
it("aborts a read when its query scope is removed", async () => {
  const controller = new AbortController();
  const result = boundedCredentialRead(new Promise(() => {}), 15000, "read", controller.signal);
  controller.abort();
  await expect(result).rejects.toThrow("superseded");
});
