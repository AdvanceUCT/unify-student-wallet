import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { copyAsync, deleteAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

import { exportEncryptedHolderWallet, validateEncryptedHolderWalletBackup } from "./holderAgent";

export const MIN_RECOVERY_PASSWORD_LENGTH = 12;
export const BACKUP_REMINDER_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const BACKUP_METADATA_KEY = "unify.wallet.backup-metadata.v1";
const BACKUP_FILE_EXTENSION = ".unifywallet";
const BACKUP_BUNDLE_FORMAT = "unify.wallet.backup.bundle";
const BACKUP_BUNDLE_VERSION = 1;
const ASKAR_SQLITE_EXTENSION = ".sqlite";
const ASKAR_SQLITE_SIDECARS = ["", "-wal", "-shm"] as const;

export type BackupMetadata = {
  lastBackupAt?: string;
};

type BackupBundleFile = {
  suffix: (typeof ASKAR_SQLITE_SIDECARS)[number];
  base64: string;
};

type BackupBundle = {
  format: typeof BACKUP_BUNDLE_FORMAT;
  version: typeof BACKUP_BUNDLE_VERSION;
  createdAt: string;
  files: BackupBundleFile[];
};

export type RecoveryPasswordValidation = { ok: true } | { ok: false; error: string };

export function validateRecoveryPassword(
  recoveryPassword: string,
  confirmation?: string,
): RecoveryPasswordValidation {
  if (recoveryPassword.length < MIN_RECOVERY_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Recovery password must be at least ${MIN_RECOVERY_PASSWORD_LENGTH} characters.`,
    };
  }

  if (confirmation !== undefined && recoveryPassword !== confirmation) {
    return { ok: false, error: "Recovery password entries do not match." };
  }

  return { ok: true };
}

export function shouldRemindToBackUp(
  credentialCount: number,
  lastBackupAt?: string,
  now = Date.now(),
) {
  if (credentialCount === 0) return false;
  if (!lastBackupAt) return true;

  const timestamp = Date.parse(lastBackupAt);
  return !Number.isFinite(timestamp) || now - timestamp >= BACKUP_REMINDER_AGE_MS;
}

export async function loadBackupMetadata(): Promise<BackupMetadata> {
  const raw = await getSecureValue(BACKUP_METADATA_KEY);

  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as BackupMetadata;
    return typeof parsed.lastBackupAt === "string" ? { lastBackupAt: parsed.lastBackupAt } : {};
  } catch {
    return {};
  }
}

export async function markWalletBackedUp(at = new Date()) {
  const metadata = { lastBackupAt: at.toISOString() };
  await saveSecureValue(BACKUP_METADATA_KEY, JSON.stringify(metadata));
  return metadata;
}

export function nativePathFromFileUri(uri: string) {
  if (!uri.startsWith("file://")) return uri;
  return decodeURIComponent(uri.replace(/^file:\/\//, ""));
}

function backupFilename(now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  return `UNIFY-wallet-${date}${BACKUP_FILE_EXTENSION}`;
}

function askarExportFilename(now = new Date()) {
  return `export-${now.getTime()}${ASKAR_SQLITE_EXTENSION}`;
}

function restoreFilename(now = new Date()) {
  return `restore-${now.getTime()}${BACKUP_FILE_EXTENSION}`;
}

function restoreAskarFilename(now = new Date()) {
  return `restore-${now.getTime()}${ASKAR_SQLITE_EXTENSION}`;
}

function askarSidecarPaths(path: string) {
  return ASKAR_SQLITE_SIDECARS.map((suffix) => ({ path: `${path}${suffix}`, suffix }));
}

async function getReactNativeFs() {
  const rnfs = await import("react-native-fs");
  return rnfs.default ?? rnfs;
}

async function deleteAskarFiles(path: string) {
  const RNFS = await getReactNativeFs();

  await Promise.all(
    askarSidecarPaths(path).map(async ({ path: candidatePath }) => {
      if (await RNFS.exists(candidatePath)) {
        await RNFS.unlink(candidatePath);
      }
    }),
  );
}

async function readAskarBackupBundleFiles(path: string): Promise<BackupBundleFile[]> {
  const RNFS = await getReactNativeFs();
  const files: BackupBundleFile[] = [];

  for (const { path: candidatePath, suffix } of askarSidecarPaths(path)) {
    if (await RNFS.exists(candidatePath)) {
      const stat = await RNFS.stat(candidatePath);
      if (Number(stat.size) > 0) {
        files.push({ suffix, base64: await RNFS.readFile(candidatePath, "base64") });
      }
    }
  }

  if (!files.some((file) => file.suffix === "")) {
    throw new Error("Wallet backup export did not create the main Askar database file.");
  }

  return files;
}

function parseBackupBundle(raw: string): BackupBundle {
  const parsed = JSON.parse(raw) as Partial<BackupBundle>;

  if (
    parsed.format !== BACKUP_BUNDLE_FORMAT ||
    parsed.version !== BACKUP_BUNDLE_VERSION ||
    !Array.isArray(parsed.files) ||
    !parsed.files.some((file) => file?.suffix === "" && typeof file.base64 === "string")
  ) {
    throw new Error("This file is not a valid UNIFY wallet backup.");
  }

  return parsed as BackupBundle;
}

async function writeBackupBundle(bundlePath: string, files: BackupBundleFile[]) {
  const RNFS = await getReactNativeFs();
  const bundle: BackupBundle = {
    format: BACKUP_BUNDLE_FORMAT,
    version: BACKUP_BUNDLE_VERSION,
    createdAt: new Date().toISOString(),
    files,
  };

  await RNFS.writeFile(bundlePath, JSON.stringify(bundle), "utf8");
}

async function unpackBackupBundle(bundlePath: string, outputPath: string) {
  const RNFS = await getReactNativeFs();
  const bundle = parseBackupBundle(await RNFS.readFile(bundlePath, "utf8"));

  await deleteAskarFiles(outputPath);

  for (const file of bundle.files) {
    await RNFS.writeFile(`${outputPath}${file.suffix}`, file.base64, "base64");
  }

  return outputPath;
}

async function copyBackupIntoRestoreCache(uri: string) {
  const restoreBundleFile = new File(Paths.cache, restoreFilename());
  const restoreAskarFile = new File(Paths.cache, restoreAskarFilename());

  if (restoreBundleFile.exists) {
    await deleteAsync(restoreBundleFile.uri, { idempotent: true });
  }

  await copyAsync({ from: uri, to: restoreBundleFile.uri });

  if (!restoreBundleFile.exists || restoreBundleFile.size <= 0) {
    throw new Error("The selected backup file is empty or could not be copied into the app.");
  }

  return unpackBackupBundle(
    nativePathFromFileUri(restoreBundleFile.uri),
    nativePathFromFileUri(restoreAskarFile.uri),
  );
}

export async function createAndShareEncryptedBackup(recoveryPassword: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("File sharing is unavailable on this device.");
  }

  const filename = backupFilename();
  const backupFile = new File(Paths.document, filename);
  const backupPath = nativePathFromFileUri(backupFile.uri);
  const askarExportFile = new File(Paths.cache, askarExportFilename());
  const askarExportPath = nativePathFromFileUri(askarExportFile.uri);

  if (backupFile.exists) {
    backupFile.delete();
  }

  try {
    await deleteAskarFiles(askarExportPath);
    await exportEncryptedHolderWallet(askarExportPath, recoveryPassword);
    await validateEncryptedHolderWalletBackup(askarExportPath, recoveryPassword);
    await writeBackupBundle(backupPath, await readAskarBackupBundleFiles(askarExportPath));
    await unpackBackupBundle(backupPath, askarExportPath);
    await validateEncryptedHolderWalletBackup(askarExportPath, recoveryPassword);
  } catch (error) {
    if (backupFile.exists) {
      backupFile.delete();
    }
    throw error;
  } finally {
    await deleteAskarFiles(askarExportPath);
  }

  await Sharing.shareAsync(backupFile.uri, {
    dialogTitle: "Save encrypted UNIFY wallet backup",
    mimeType: "application/octet-stream",
    UTI: "public.data",
  });
  return await markWalletBackedUp();
}

export async function pickEncryptedBackupFile() {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: "application/octet-stream",
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  if (!asset.name.toLowerCase().endsWith(BACKUP_FILE_EXTENSION)) {
    throw new Error("Choose a UNIFY wallet backup file ending in .unifywallet.");
  }

  return {
    name: asset.name,
    path: await copyBackupIntoRestoreCache(asset.uri),
  };
}

export const __walletBackupTestInternals = {
  askarSidecarPaths,
  parseBackupBundle,
  restoreFilename,
};
