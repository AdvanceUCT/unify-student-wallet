import { parseVerificationActivity } from "../activityHistory";

describe("parseVerificationActivity", () => {
  it("returns valid terminal verification records", () => {
    const record = { id: "request-1", walletId: "wallet-1", proofExchangeId: "proof-1", verifierName: "Vendor", servicePointName: "Main", status: "Approved", disclosedValues: [{ name: "Faculty", value: "Science" }], occurredAt: "2026-08-08T00:00:00.000Z" };
    expect(parseVerificationActivity(JSON.stringify([record]))).toEqual([record]);
  });

  it("ignores malformed and pending records", () => {
    expect(parseVerificationActivity("not-json")).toEqual([]);
    expect(parseVerificationActivity(JSON.stringify([{ status: "Pending" }]))).toEqual([]);
  });
});
