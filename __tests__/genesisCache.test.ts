const mockFs = {
  DocumentDirectoryPath: "/documents",
  exists: jest.fn(),
  moveFile: jest.fn(),
  readFile: jest.fn(),
  unlink: jest.fn(),
  writeFile: jest.fn(),
};

jest.mock("react-native-fs", () => ({
  __esModule: true,
  default: mockFs,
}));

import {
  isValidGenesisTransactions,
  readCachedGenesisTransactions,
  writeCachedGenesisTransactions,
} from "@/src/features/wallet/genesisCache";

const validGenesis = [
  JSON.stringify({ reqSignature: {}, txn: { data: { data: { alias: "Node1" } } } }),
  JSON.stringify({ reqSignature: {}, txn: { data: { data: { alias: "Node2" } } } }),
].join("\n");

describe("BCovrin genesis cache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.exists.mockResolvedValue(true);
    mockFs.moveFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(validGenesis);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("accepts JSON-line genesis transactions", () => {
    expect(isValidGenesisTransactions(validGenesis)).toBe(true);
    expect(isValidGenesisTransactions("not-json")).toBe(false);
  });

  it("returns a valid durable cache for offline startup", async () => {
    await expect(readCachedGenesisTransactions()).resolves.toBe(validGenesis);
    expect(mockFs.readFile).toHaveBeenCalledWith("/documents/bcovrin-test-genesis.txn", "utf8");
  });

  it("removes malformed cache data so the caller can refetch", async () => {
    mockFs.readFile.mockResolvedValueOnce("invalid");

    await expect(readCachedGenesisTransactions()).resolves.toBeNull();
    expect(mockFs.unlink).toHaveBeenCalledWith("/documents/bcovrin-test-genesis.txn");
  });

  it("writes through a temporary file after successful setup", async () => {
    jest.spyOn(Date, "now").mockReturnValueOnce(1234);

    await writeCachedGenesisTransactions(validGenesis);

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      "/documents/bcovrin-test-genesis.txn.1234.tmp",
      validGenesis,
      "utf8",
    );
    expect(mockFs.moveFile).toHaveBeenCalledWith(
      "/documents/bcovrin-test-genesis.txn.1234.tmp",
      "/documents/bcovrin-test-genesis.txn",
    );
  });
});
