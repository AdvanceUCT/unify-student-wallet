import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

import { exportEncryptedHolderWallet } from "./holderAgent";

export const MIN_RECOVERY_PASSWORD_LENGTH = 12;
export const BACKUP_REMINDER_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const BACKUP_METADATA_KEY = "unify.wallet.backup-metadata.v1";
const BACKUP_FILE_EXTENSION = ".unifywallet";

export type BackupMetadata = {
  lastBackupAt?: string;
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

export async function createAndShareEncryptedBackup(recoveryPassword: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("File sharing is unavailable on this device.");
  }

  const filename = backupFilename();
  const backupFile = new File(Paths.cache, filename);
  const nativePath = nativePathFromFileUri(backupFile.uri);

  if (backupFile.exists) {
    backupFile.delete();
  }

  try {
    await exportEncryptedHolderWallet(nativePath, recoveryPassword);
    await Sharing.shareAsync(backupFile.uri, {
      dialogTitle: "Save encrypted UNIFY wallet backup",
      mimeType: "application/octet-stream",
      UTI: "public.data",
    });
    return await markWalletBackedUp();
  } finally {
    if (backupFile.exists) {
      backupFile.delete();
    }
  }
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
    path: nativePathFromFileUri(asset.uri),
  };
}
