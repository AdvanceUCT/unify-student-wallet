export type CredentialAttribute = {
  name: string;
  value: string;
};

export type CredentialMetadataSource = {
  id: string;
  state?: string;
  credentialAttributes?: CredentialAttribute[];
  connectionLabel?: string;
  credentials?: { credentialRecordId: string; credentialRecordType: string }[];
};

export function normalizedCredentialAttributeName(name: string) {
  return name.replace(/[\s_-]/g, "").toLowerCase();
}

export function credentialAttributeValue(
  credential: Pick<CredentialMetadataSource, "credentialAttributes">,
  ...names: string[]
) {
  const expectedNames = new Set(names.map(normalizedCredentialAttributeName));
  return credential.credentialAttributes?.find((attribute) =>
    expectedNames.has(normalizedCredentialAttributeName(attribute.name)),
  )?.value;
}

export function credentialMetadata(credential: CredentialMetadataSource) {
  const firstName = credentialAttributeValue(credential, "firstName", "givenName");
  const lastName = credentialAttributeValue(credential, "lastName", "familyName", "surname");
  const faculty = credentialAttributeValue(credential, "faculty", "school", "department");
  const programme = credentialAttributeValue(credential, "programme", "program") ?? faculty;

  return {
    expiresAt: credentialAttributeValue(
      credential,
      "expiresAt",
      "expiryDate",
      "expirationDate",
    ),
    faculty,
    firstName,
    holderName: [firstName, lastName].filter(Boolean).join(" ").trim(),
    issuedAt: credentialAttributeValue(
      credential,
      "issuedAt",
      "validFrom",
      "issuanceDate",
    ),
    issuer:
      credentialAttributeValue(
        credential,
        "institution",
        "university",
        "issuerName",
        "issuer",
      ) ?? credential.connectionLabel,
    lastName,
    programme,
    studentNumber: credentialAttributeValue(
      credential,
      "studentNumber",
      "studentId",
    ),
    year: credentialAttributeValue(credential, "year", "yearOfStudy", "academicYear"),
  };
}

export function parseCredentialDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

export function formatCredentialDate(value: string | undefined) {
  return parseCredentialDate(value)?.toISOString().slice(0, 10) ?? "Not provided";
}
