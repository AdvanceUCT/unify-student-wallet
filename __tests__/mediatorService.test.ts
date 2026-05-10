import { MEDIATOR_INVITATION_URL } from "@/src/features/wallet/mediatorService";

describe("mediator service", () => {
  it("hardcodes the Indicio mediator invitation URL", () => {
    expect(MEDIATOR_INVITATION_URL).toBe("https://indicio-tech.github.io/mediator/");
  });
});
