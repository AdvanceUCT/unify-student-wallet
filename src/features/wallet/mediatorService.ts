export const MEDIATOR_INVITATION_URL_ENV = "EXPO_PUBLIC_MEDIATOR_INVITATION_URL";
export const MEDIATOR_PICKUP_STRATEGY_ENV = "EXPO_PUBLIC_MEDIATOR_PICKUP_STRATEGY";
export const INDICIO_MEDIATOR_LANDING_PAGE_URL = "https://indicio-tech.github.io/mediator/";
export const DEFAULT_MEDIATOR_PICKUP_STRATEGY = "Implicit";

const SUPPORTED_MEDIATOR_PICKUP_STRATEGIES = ["Implicit", "PickUpV1", "PickUpV2", "PickUpV2LiveMode", "None"] as const;

export type MediatorPickupStrategyName = (typeof SUPPORTED_MEDIATOR_PICKUP_STRATEGIES)[number];

type MediatorEnvironment = Record<string, string | undefined>;

function getDefaultMediatorEnvironment(): MediatorEnvironment {
  return {
    EXPO_PUBLIC_MEDIATOR_INVITATION_URL: process.env.EXPO_PUBLIC_MEDIATOR_INVITATION_URL,
    EXPO_PUBLIC_MEDIATOR_PICKUP_STRATEGY: process.env.EXPO_PUBLIC_MEDIATOR_PICKUP_STRATEGY,
  };
}

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

export function getMediatorInvitationUrl(environment: MediatorEnvironment = getDefaultMediatorEnvironment()): string {
  return validateMediatorInvitationUrl(environment[MEDIATOR_INVITATION_URL_ENV]);
}

export function validateMediatorPickupStrategy(value: string | undefined): MediatorPickupStrategyName {
  const pickupStrategy = value?.trim() || DEFAULT_MEDIATOR_PICKUP_STRATEGY;

  if (!SUPPORTED_MEDIATOR_PICKUP_STRATEGIES.includes(pickupStrategy as MediatorPickupStrategyName)) {
    throw new Error(
      `${MEDIATOR_PICKUP_STRATEGY_ENV} must be one of: ${SUPPORTED_MEDIATOR_PICKUP_STRATEGIES.join(", ")}.`,
    );
  }

  return pickupStrategy as MediatorPickupStrategyName;
}

export function getMediatorPickupStrategy(
  environment: MediatorEnvironment = getDefaultMediatorEnvironment(),
): MediatorPickupStrategyName {
  return validateMediatorPickupStrategy(environment[MEDIATOR_PICKUP_STRATEGY_ENV]);
}
