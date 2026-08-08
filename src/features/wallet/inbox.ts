import {
  credentialMetadata,
  formatCredentialDate,
  parseCredentialDate,
  type CredentialMetadataSource,
} from "./credentialMetadata";

const DAY_MS = 24 * 60 * 60 * 1000;
export const CREDENTIAL_EXPIRY_WARNING_DAYS = 30;

export type CredentialInboxAlert = {
  credentialId: string;
  expiresAt: string;
  id: string;
  message: string;
  title: string;
  type: "expired" | "expiring";
};

export function buildCredentialInboxAlerts(
  credentials: CredentialMetadataSource[],
  now = new Date(),
): CredentialInboxAlert[] {
  const warningBoundary = now.getTime() + CREDENTIAL_EXPIRY_WARNING_DAYS * DAY_MS;

  return credentials
    .flatMap((credential): CredentialInboxAlert[] => {
      const metadata = credentialMetadata(credential);
      const expiry = parseCredentialDate(metadata.expiresAt);
      if (!expiry || expiry.getTime() > warningBoundary) return [];

      const type = expiry.getTime() <= now.getTime() ? "expired" : "expiring";
      const credentialName = metadata.programme ?? "Student credential";
      const issuer = metadata.issuer ? ` from ${metadata.issuer}` : "";
      const date = formatCredentialDate(metadata.expiresAt);

      return [{
        credentialId: credential.id,
        expiresAt: expiry.toISOString(),
        id: `${type}:${credential.id}`,
        message: type === "expired"
          ? `${credentialName}${issuer} expired on ${date}.`
          : `${credentialName}${issuer} is valid until ${date}.`,
        title: type === "expired" ? "Credential expired" : "Credential expires soon",
        type,
      }];
    })
    .sort((left, right) => {
      if (left.type !== right.type) return left.type === "expired" ? -1 : 1;
      return new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime();
    });
}
