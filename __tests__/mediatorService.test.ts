import {
  clearMediatorState,
  INDICIO_MEDIATOR_INVITATION_URL,
  loadMediatorState,
  MEDIATOR_POLLING_INTERVAL_MS,
  resolveMediatorInvitationUrl,
  saveMediatorState,
  type MediatorState,
} from "@/src/features/wallet/mediatorService";

const mockStore = new Map<string, string>();
const originalMediatorUrl = process.env.EXPO_PUBLIC_UNIFY_MEDIATOR_INVITATION_URL;

jest.mock("@/src/lib/storage/secureStore", () => ({
  deleteSecureValue: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
  getSecureValue: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  saveSecureValue: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
}));

const validState: MediatorState = {
  connectionId: "conn-abc123",
  establishedAt: "2026-05-09T10:00:00.000Z",
  invitationUrl: INDICIO_MEDIATOR_INVITATION_URL,
  mediationState: "granted",
};

describe("resolveMediatorInvitationUrl", () => {
  afterEach(() => {
    process.env.EXPO_PUBLIC_UNIFY_MEDIATOR_INVITATION_URL = originalMediatorUrl;
  });

  it("prefers the activation-provided URL when present", () => {
    const custom = "https://custom-mediator.test/?oob=abc";
    expect(resolveMediatorInvitationUrl(custom)).toBe(custom);
  });

  it("uses the env-var override when no activation URL is given", () => {
    process.env.EXPO_PUBLIC_UNIFY_MEDIATOR_INVITATION_URL = "https://staging-mediator.test/";
    expect(resolveMediatorInvitationUrl()).toBe("https://staging-mediator.test/");
  });

  it("falls back to the Indicio public mediator when no URL or env var is set", () => {
    delete process.env.EXPO_PUBLIC_UNIFY_MEDIATOR_INVITATION_URL;
    expect(resolveMediatorInvitationUrl()).toBe(INDICIO_MEDIATOR_INVITATION_URL);
    expect(resolveMediatorInvitationUrl(undefined)).toBe(INDICIO_MEDIATOR_INVITATION_URL);
  });

  it("activation-provided URL wins over the env-var override", () => {
    process.env.EXPO_PUBLIC_UNIFY_MEDIATOR_INVITATION_URL = "https://staging-mediator.test/";
    const custom = "https://activation-mediator.test/?oob=xyz";
    expect(resolveMediatorInvitationUrl(custom)).toBe(custom);
  });
});

describe("MEDIATOR_POLLING_INTERVAL_MS", () => {
  it("is set to a positive number (meaningful polling)", () => {
    expect(MEDIATOR_POLLING_INTERVAL_MS).toBeGreaterThan(0);
  });
});

describe("mediator state persistence", () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it("round-trips a valid MediatorState through save and load", async () => {
    await saveMediatorState(validState);
    const loaded = await loadMediatorState();

    expect(loaded).toEqual(validState);
  });

  it("returns null when nothing has been saved", async () => {
    expect(await loadMediatorState()).toBeNull();
  });

  it("returns null after clearMediatorState", async () => {
    await saveMediatorState(validState);
    await clearMediatorState();

    expect(await loadMediatorState()).toBeNull();
  });

  it("returns null when stored JSON is missing required fields", async () => {
    // Missing connectionId — must be rejected
    const partial = { establishedAt: "2026-05-09T10:00:00.000Z", invitationUrl: INDICIO_MEDIATOR_INVITATION_URL };
    mockStore.set("unify.mediator.state.v1", JSON.stringify(partial));

    expect(await loadMediatorState()).toBeNull();
  });

  it("returns null when the stored value is not valid JSON", async () => {
    mockStore.set("unify.mediator.state.v1", "not-json{{");
    expect(await loadMediatorState()).toBeNull();
  });

  it("defaults mediationState to 'unknown' when the field is absent from storage", async () => {
    const withoutState = { connectionId: "conn-x", establishedAt: "2026-05-09T10:00:00.000Z", invitationUrl: "https://mediator.test/" };
    mockStore.set("unify.mediator.state.v1", JSON.stringify(withoutState));

    const loaded = await loadMediatorState();
    expect(loaded?.mediationState).toBe("unknown");
  });
});
