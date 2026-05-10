export const MEDIATOR_INVITATION_URL_ENV = "EXPO_PUBLIC_MEDIATOR_INVITATION_URL";
export const INDICIO_MEDIATOR_LANDING_PAGE_URL = "https://indicio-tech.github.io/mediator/";

type MediatorEnvironment = Record<string, string | undefined>;

function normalizeUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function validateMediatorInvitationUrl(value: string | undefined): string {
  const invitationUrl = value?.trim();

  if (!invitationUrl) {
    throw new Error(
      `${MEDIATOR_INVITATION_URL_ENV} is required before the native wallet can connect to a DIDComm mediator.`,
    );
  }

  if (normalizeUrl(invitationUrl) === normalizeUrl(INDICIO_MEDIATOR_LANDING_PAGE_URL)) {
    throw new Error(
      `${MEDIATOR_INVITATION_URL_ENV} must be the copied Indicio mediator invitation URL, not the setup page URL.`,
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(invitationUrl);
  } catch {
    throw new Error(`${MEDIATOR_INVITATION_URL_ENV} must be a valid URL.`);
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`${MEDIATOR_INVITATION_URL_ENV} must be an HTTP(S) DIDComm invitation URL.`);
  }

  if (!parsedUrl.searchParams.has("c_i") && !parsedUrl.searchParams.has("oob")) {
    throw new Error(`${MEDIATOR_INVITATION_URL_ENV} must include a DIDComm invitation query parameter.`);
  }

  return invitationUrl;
}

export function getMediatorInvitationUrl(environment: MediatorEnvironment = process.env): string {
  return validateMediatorInvitationUrl(environment[MEDIATOR_INVITATION_URL_ENV]);
}
