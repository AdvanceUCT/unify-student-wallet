import { getCredentialRecords } from "./holderAgent";

export type CredentialAttribute = {
  mimeType?: string;
  name: string;
  value: string;
};

export type VerifiedCredentialRecord = {
  attributes: CredentialAttribute[];
  id: string;
  state: string;
};

export class CredentialIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialIntegrityError";
  }
}

// A credential must be in one of these states for its attribute data to be present.
const COMPLETE_STATES = new Set(["done", "credential-received"]);

function validateAttributes(raw: unknown): CredentialAttribute[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new CredentialIntegrityError("Credential is missing required attribute fields.");
  }

  return raw.map((attr: unknown, index: number) => {
    if (
      typeof attr !== "object" ||
      attr === null ||
      typeof (attr as Record<string, unknown>).name !== "string" ||
      !(attr as Record<string, unknown>).name ||
      typeof (attr as Record<string, unknown>).value !== "string"
    ) {
      throw new CredentialIntegrityError(`Credential attribute at index ${index} is malformed.`);
    }

    const a = attr as { mimeType?: unknown; name: string; value: string };

    return {
      name: a.name,
      value: a.value,
      ...(typeof a.mimeType === "string" && { mimeType: a.mimeType }),
    };
  });
}

function validateRecord(record: unknown, expectedId?: string): VerifiedCredentialRecord {
  if (typeof record !== "object" || record === null) {
    throw new CredentialIntegrityError("Credential record is missing or has an invalid structure.");
  }

  const rec = record as Record<string, unknown>;

  if (typeof rec.id !== "string" || !rec.id) {
    throw new CredentialIntegrityError("Credential record is missing a valid identifier.");
  }

  if (expectedId !== undefined && rec.id !== expectedId) {
    throw new CredentialIntegrityError("Credential record ID does not match the expected identifier.");
  }

  if (typeof rec.state !== "string" || !rec.state) {
    throw new CredentialIntegrityError("Credential record is missing a state field.");
  }

  if (!COMPLETE_STATES.has(rec.state)) {
    throw new CredentialIntegrityError(
      `Credential is in an incomplete state: "${rec.state}". Expected a fully issued credential.`,
    );
  }

  const attributes = validateAttributes(rec.credentialAttributes);

  return { attributes, id: rec.id, state: rec.state };
}

export async function getVerifiedCredential(credentialRecordId: string): Promise<VerifiedCredentialRecord> {
  const records = await getCredentialRecords();
  const record = records.find((r) => r.id === credentialRecordId);

  if (!record) {
    throw new CredentialIntegrityError(`No credential found with ID: ${credentialRecordId}.`);
  }

  return validateRecord(record, credentialRecordId);
}

export async function getAllVerifiedCredentials(): Promise<VerifiedCredentialRecord[]> {
  const records = await getCredentialRecords();

  return records.map((record) => validateRecord(record));
}
