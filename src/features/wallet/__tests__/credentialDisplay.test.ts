import { formatCredentialLabel, formatCredentialValue } from "../credentialDisplay";

describe("credential display formatting", () => {
  it("uses stable labels for common credential fields", () => {
    expect(formatCredentialLabel("studentNumber")).toBe("Student number");
    expect(formatCredentialLabel("valid_to")).toBe("Valid to");
    expect(formatCredentialLabel("customAttribute")).toBe("Custom Attribute");
  });

  it("formats credential dates without exposing raw ISO timestamps", () => {
    expect(formatCredentialValue("issuedAt", "2026-08-09T00:00:00.000Z")).not.toContain("T00:00");
    expect(formatCredentialValue("validTo", "2027-08-09T14:30:00.000Z")).toMatch(/09 Aug 2027, \d{2}:\d{2}/);
  });

  it("preserves identifiers and reports missing values", () => {
    expect(formatCredentialValue("studentNumber", "2026-08-09")).toBe("2026-08-09");
    expect(formatCredentialValue("faculty", " ")).toBe("Not provided");
  });
});
