import {
  getMediatorInvitationUrl,
  INDICIO_MEDIATOR_LANDING_PAGE_URL,
  MEDIATOR_INVITATION_URL_ENV,
  validateMediatorInvitationUrl,
} from "@/src/features/wallet/mediatorService";

describe("mediator service", () => {
  it("reads the mediator invitation URL from Expo public env", () => {
    expect(
      getMediatorInvitationUrl({
        EXPO_PUBLIC_MEDIATOR_INVITATION_URL: "https://mediator2.indiciotech.io?c_i=eyJ0eXAiOiJKV00i",
      }),
    ).toBe("https://mediator2.indiciotech.io?c_i=eyJ0eXAiOiJKV00i");
  });

  it("accepts OOB invitation query parameters", () => {
    expect(validateMediatorInvitationUrl("https://mediator.example/oob?oob=eyJAdHlwZSI")).toBe(
      "https://mediator.example/oob?oob=eyJAdHlwZSI",
    );
  });

  it("requires the mediator invitation env variable", () => {
    expect(() => getMediatorInvitationUrl({})).toThrow(
      `${MEDIATOR_INVITATION_URL_ENV} is required before the native wallet can connect to a DIDComm mediator.`,
    );
  });

  it("rejects a blank mediator invitation env variable", () => {
    expect(() => validateMediatorInvitationUrl("   ")).toThrow(
      `${MEDIATOR_INVITATION_URL_ENV} is required before the native wallet can connect to a DIDComm mediator.`,
    );
  });

  it("rejects the Indicio setup page URL", () => {
    expect(() => validateMediatorInvitationUrl(INDICIO_MEDIATOR_LANDING_PAGE_URL)).toThrow(
      `${MEDIATOR_INVITATION_URL_ENV} must be the copied Indicio mediator invitation URL, not the setup page URL.`,
    );
  });

  it("rejects URLs without DIDComm invitation query parameters", () => {
    expect(() => validateMediatorInvitationUrl("https://mediator2.indiciotech.io")).toThrow(
      `${MEDIATOR_INVITATION_URL_ENV} must include a DIDComm invitation query parameter.`,
    );
  });
});
