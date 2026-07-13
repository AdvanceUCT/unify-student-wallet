import {
  BACKUP_REMINDER_AGE_MS,
  __walletBackupTestInternals,
  nativePathFromFileUri,
  shouldRemindToBackUp,
  validateRecoveryPassword,
} from "@/src/features/wallet/walletBackup";

describe("wallet backup policy", () => {
  it("requires a strong matching recovery password", () => {
    expect(validateRecoveryPassword("short", "short")).toEqual({
      ok: false,
      error: "Recovery password must be at least 12 characters.",
    });
    expect(validateRecoveryPassword("a-long-recovery-password", "different-password")).toEqual({
      ok: false,
      error: "Recovery password entries do not match.",
    });
    expect(validateRecoveryPassword("a-long-recovery-password", "a-long-recovery-password")).toEqual({
      ok: true,
    });
  });

  it("reminds credential holders when no recent backup exists", () => {
    const now = Date.parse("2026-07-08T12:00:00.000Z");
    expect(shouldRemindToBackUp(0, undefined, now)).toBe(false);
    expect(shouldRemindToBackUp(1, undefined, now)).toBe(true);
    expect(shouldRemindToBackUp(1, new Date(now - BACKUP_REMINDER_AGE_MS + 1).toISOString(), now)).toBe(false);
    expect(shouldRemindToBackUp(1, new Date(now - BACKUP_REMINDER_AGE_MS).toISOString(), now)).toBe(true);
  });

  it("converts a copied document URI into the path Askar expects", () => {
    expect(nativePathFromFileUri("file:///data/user/0/unify/cache/My%20Wallet.unifywallet")).toBe(
      "/data/user/0/unify/cache/My Wallet.unifywallet",
    );
  });

  it("tracks the SQLite sidecar files that Askar may create", () => {
    expect(__walletBackupTestInternals.askarSidecarPaths("/cache/export.sqlite")).toEqual([
      { path: "/cache/export.sqlite", suffix: "" },
      { path: "/cache/export.sqlite-wal", suffix: "-wal" },
      { path: "/cache/export.sqlite-shm", suffix: "-shm" },
    ]);
  });

  it("rejects backup bundles that do not contain the main Askar database", () => {
    const invalidBundle = JSON.stringify({
      format: "unify.wallet.backup.bundle",
      version: 1,
      files: [{ suffix: "-wal", base64: "abc" }],
    });

    expect(() => __walletBackupTestInternals.parseBackupBundle(invalidBundle)).toThrow(
      "This file is not a valid UNIFY wallet backup.",
    );
  });
});
