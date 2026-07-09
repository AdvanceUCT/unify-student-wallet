import {
  BACKUP_REMINDER_AGE_MS,
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
});
