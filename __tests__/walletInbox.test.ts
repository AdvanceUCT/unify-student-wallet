import { buildCredentialInboxAlerts } from "@/src/features/wallet/inbox";

describe("wallet credential alerts", () => {
  const now = new Date("2026-08-08T10:00:00.000Z");

  it("returns expired and soon-to-expire credentials in priority order", () => {
    const alerts = buildCredentialInboxAlerts([
      {
        id: "future",
        credentialAttributes: [{ name: "expiresAt", value: "2027-08-08T10:00:00.000Z" }],
      },
      {
        id: "soon",
        credentialAttributes: [
          { name: "programme", value: "BSc Computer Science" },
          { name: "institution", value: "University of Cape Town" },
          { name: "expiresAt", value: "2026-08-20T10:00:00.000Z" },
        ],
      },
      {
        id: "expired",
        credentialAttributes: [{ name: "expires_at", value: "2026-08-01T10:00:00.000Z" }],
      },
    ], now);

    expect(alerts.map((alert) => alert.type)).toEqual(["expired", "expiring"]);
    expect(alerts[1].message).toBe(
      "BSc Computer Science from University of Cape Town is valid until 2026-08-20.",
    );
  });

  it("ignores credentials without a signed, valid expiry date", () => {
    expect(buildCredentialInboxAlerts([
      { id: "missing" },
      { id: "invalid", credentialAttributes: [{ name: "expiresAt", value: "not-a-date" }] },
    ], now)).toEqual([]);
  });
});
