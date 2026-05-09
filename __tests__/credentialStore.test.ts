import {
  CredentialIntegrityError,
  getAllVerifiedCredentials,
  getVerifiedCredential,
} from "@/src/features/wallet/credentialStore";
import type { CredentialRecord } from "@/src/features/wallet/holderAgent";

const mockGetCredentialRecords = jest.fn<Promise<CredentialRecord[]>, []>();

jest.mock("@/src/features/wallet/holderAgent", () => ({
  getCredentialRecords: () => mockGetCredentialRecords(),
}));

const validRecord: CredentialRecord = {
  credentialAttributes: [
    { name: "studentId", value: "student-demo-001" },
    { name: "fullName", value: "Jane Doe" },
    { name: "programme", value: "Computer Science" },
    { name: "issuanceDate", value: "2026-05-09" },
  ],
  id: "cred-001",
  state: "done",
};

describe("getVerifiedCredential", () => {
  beforeEach(() => {
    mockGetCredentialRecords.mockReset();
  });

  it("returns a verified record with typed attributes for a valid credential", async () => {
    mockGetCredentialRecords.mockResolvedValue([validRecord]);

    const result = await getVerifiedCredential("cred-001");

    expect(result.id).toBe("cred-001");
    expect(result.state).toBe("done");
    expect(result.attributes).toHaveLength(4);
    expect(result.attributes[0]).toEqual({ name: "studentId", value: "student-demo-001" });
  });

  it("accepts a credential in credential-received state", async () => {
    const received: CredentialRecord = { ...validRecord, state: "credential-received" };
    mockGetCredentialRecords.mockResolvedValue([received]);

    const result = await getVerifiedCredential("cred-001");

    expect(result.state).toBe("credential-received");
  });

  it("includes mimeType on attributes that declare one", async () => {
    const withMimeType: CredentialRecord = {
      ...validRecord,
      credentialAttributes: [{ mimeType: "image/jpeg", name: "photo", value: "base64..." }],
    };
    mockGetCredentialRecords.mockResolvedValue([withMimeType]);

    const result = await getVerifiedCredential("cred-001");

    expect(result.attributes[0].mimeType).toBe("image/jpeg");
  });

  it("throws CredentialIntegrityError when no credential matches the requested ID", async () => {
    mockGetCredentialRecords.mockResolvedValue([validRecord]);

    await expect(getVerifiedCredential("cred-does-not-exist")).rejects.toBeInstanceOf(CredentialIntegrityError);
  });

  it("throws when the record has no id", async () => {
    const noId: CredentialRecord = { ...validRecord, id: undefined };
    mockGetCredentialRecords.mockResolvedValue([noId]);

    await expect(getVerifiedCredential("cred-001")).rejects.toBeInstanceOf(CredentialIntegrityError);
  });

  it("throws when the record has no state field", async () => {
    const noState: CredentialRecord = { ...validRecord, state: undefined };
    mockGetCredentialRecords.mockResolvedValue([noState]);

    await expect(getVerifiedCredential("cred-001")).rejects.toBeInstanceOf(CredentialIntegrityError);
  });

  it("throws when the credential is in an incomplete state", async () => {
    const pending: CredentialRecord = { ...validRecord, state: "offer-received" };
    mockGetCredentialRecords.mockResolvedValue([pending]);

    await expect(getVerifiedCredential("cred-001")).rejects.toBeInstanceOf(CredentialIntegrityError);
  });

  it("throws when credentialAttributes is missing", async () => {
    const noAttrs: CredentialRecord = { id: "cred-001", state: "done" };
    mockGetCredentialRecords.mockResolvedValue([noAttrs]);

    await expect(getVerifiedCredential("cred-001")).rejects.toBeInstanceOf(CredentialIntegrityError);
  });

  it("throws when credentialAttributes is an empty array", async () => {
    const emptyAttrs: CredentialRecord = { ...validRecord, credentialAttributes: [] };
    mockGetCredentialRecords.mockResolvedValue([emptyAttrs]);

    await expect(getVerifiedCredential("cred-001")).rejects.toBeInstanceOf(CredentialIntegrityError);
  });

  it("throws when an attribute has an empty name", async () => {
    const badAttr: CredentialRecord = {
      ...validRecord,
      credentialAttributes: [{ name: "", value: "some-value" }],
    };
    mockGetCredentialRecords.mockResolvedValue([badAttr]);

    await expect(getVerifiedCredential("cred-001")).rejects.toBeInstanceOf(CredentialIntegrityError);
  });

  it("throws when an attribute is not an object", async () => {
    const badAttr = {
      ...validRecord,
      credentialAttributes: ["not-an-object"] as unknown as CredentialRecord["credentialAttributes"],
    };
    mockGetCredentialRecords.mockResolvedValue([badAttr]);

    await expect(getVerifiedCredential("cred-001")).rejects.toBeInstanceOf(CredentialIntegrityError);
  });

  it("CredentialIntegrityError has the correct name property", async () => {
    mockGetCredentialRecords.mockResolvedValue([]);

    try {
      await getVerifiedCredential("cred-001");
    } catch (err) {
      expect(err).toBeInstanceOf(CredentialIntegrityError);
      expect((err as CredentialIntegrityError).name).toBe("CredentialIntegrityError");
    }
  });
});

describe("getAllVerifiedCredentials", () => {
  beforeEach(() => {
    mockGetCredentialRecords.mockReset();
  });

  it("returns an empty array when no credentials are stored", async () => {
    mockGetCredentialRecords.mockResolvedValue([]);

    await expect(getAllVerifiedCredentials()).resolves.toEqual([]);
  });

  it("returns all credentials when multiple valid records exist", async () => {
    const second: CredentialRecord = { ...validRecord, id: "cred-002" };
    mockGetCredentialRecords.mockResolvedValue([validRecord, second]);

    const results = await getAllVerifiedCredentials();

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("cred-001");
    expect(results[1].id).toBe("cred-002");
  });

  it("throws when any credential in the list fails integrity validation", async () => {
    const tampered: CredentialRecord = { ...validRecord, id: "cred-002", credentialAttributes: [] };
    mockGetCredentialRecords.mockResolvedValue([validRecord, tampered]);

    await expect(getAllVerifiedCredentials()).rejects.toBeInstanceOf(CredentialIntegrityError);
  });

  it("throws when any credential in the list is in an incomplete state", async () => {
    const abandoned: CredentialRecord = { ...validRecord, id: "cred-002", state: "abandoned" };
    mockGetCredentialRecords.mockResolvedValue([validRecord, abandoned]);

    await expect(getAllVerifiedCredentials()).rejects.toBeInstanceOf(CredentialIntegrityError);
  });
});
