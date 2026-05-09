import { deleteSecureValue, getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

// Indicio Public Cloud Mediator — OOB invitation page for the Indicio test network.
// Override with EXPO_PUBLIC_UNIFY_MEDIATOR_INVITATION_URL for staging/production deployments.
export const INDICIO_MEDIATOR_INVITATION_URL = "https://indicio-tech.github.io/mediator/";

// RFC 0482 pickup polling interval: how often the wallet checks the mediator for waiting messages.
export const MEDIATOR_POLLING_INTERVAL_MS = 30_000;

const MEDIATOR_STATE_KEY = "unify.mediator.state.v1";

export type MediatorState = {
  connectionId: string;
  establishedAt: string;
  invitationUrl: string;
  mediationState: string;
};

/**
 * Returns the mediator invitation URL to use for this session.
 * Prefers the activation-provided URL (issuer may route through a custom mediator),
 * then the env-var override, then falls back to the public Indicio test mediator.
 */
export function resolveMediatorInvitationUrl(activationProvidedUrl?: string): string {
  if (activationProvidedUrl) {
    return activationProvidedUrl;
  }

  return process.env.EXPO_PUBLIC_UNIFY_MEDIATOR_INVITATION_URL?.trim() || INDICIO_MEDIATOR_INVITATION_URL;
}

export async function saveMediatorState(state: MediatorState): Promise<void> {
  await saveSecureValue(MEDIATOR_STATE_KEY, JSON.stringify(state));
}

export async function loadMediatorState(): Promise<MediatorState | null> {
  const raw = await getSecureValue(MEDIATOR_STATE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MediatorState>;

    if (!parsed.connectionId || !parsed.establishedAt || !parsed.invitationUrl) {
      return null;
    }

    return {
      connectionId: parsed.connectionId,
      establishedAt: parsed.establishedAt,
      invitationUrl: parsed.invitationUrl,
      mediationState: parsed.mediationState ?? "unknown",
    };
  } catch {
    return null;
  }
}

export async function clearMediatorState(): Promise<void> {
  await deleteSecureValue(MEDIATOR_STATE_KEY);
}
