/**
 * @fileoverview Downloads and caches ledger genesis data required by the native agent.
 * @module features/wallet/genesisCache
 */

const GENESIS_CACHE_FILENAME = "bcovrin-test-genesis.txn";

type ReactNativeFs = {
  DocumentDirectoryPath: string;
  exists: (path: string) => Promise<boolean>;
  moveFile: (source: string, destination: string) => Promise<void>;
  readFile: (path: string, encoding: "utf8") => Promise<string>;
  unlink: (path: string) => Promise<void>;
  writeFile: (path: string, contents: string, encoding: "utf8") => Promise<void>;
};

async function getReactNativeFs(): Promise<ReactNativeFs> {
  // Keep filesystem bindings out of the startup path while remaining compatible with Jest.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require("react-native-fs") as { default?: ReactNativeFs } & ReactNativeFs;
  return (module.default ?? module) as ReactNativeFs;
}

function cachePath(documentDirectoryPath: string) {
  return `${documentDirectoryPath}/${GENESIS_CACHE_FILENAME}`;
}

export function isValidGenesisTransactions(value: string) {
  const transactions = value.trim().split(/\r?\n/).filter(Boolean);
  if (transactions.length === 0) return false;

  return transactions.every((transaction) => {
    try {
      const parsed = JSON.parse(transaction);
      return Boolean(
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        "txn" in parsed &&
        parsed.txn &&
        typeof parsed.txn === "object",
      );
    } catch {
      return false;
    }
  });
}

export async function readCachedGenesisTransactions() {
  const RNFS = await getReactNativeFs();
  const path = cachePath(RNFS.DocumentDirectoryPath);

  try {
    if (!(await RNFS.exists(path))) return null;
    const transactions = await RNFS.readFile(path, "utf8");
    if (isValidGenesisTransactions(transactions)) return transactions;
    await RNFS.unlink(path).catch(() => undefined);
    return null;
  } catch {
    return null;
  }
}

export async function writeCachedGenesisTransactions(transactions: string) {
  if (!isValidGenesisTransactions(transactions)) {
    throw new Error("BCovrin genesis transactions are malformed.");
  }

  const RNFS = await getReactNativeFs();
  const path = cachePath(RNFS.DocumentDirectoryPath);
  const temporaryPath = `${path}.${Date.now()}.tmp`;

  try {
    await RNFS.writeFile(temporaryPath, transactions.trim(), "utf8");
    await RNFS.moveFile(temporaryPath, path);
  } catch (error) {
    if (await RNFS.exists(temporaryPath).catch(() => false)) {
      await RNFS.unlink(temporaryPath).catch(() => undefined);
    }
    throw error;
  }
}
