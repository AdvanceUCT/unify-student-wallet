import {
  parseVerificationHistory,
  upsertVerificationHistory,
  type VerificationHistoryItem,
} from "@/src/features/verification/history";

const baseItem: VerificationHistoryItem = {
  verificationRequestId: "verification-001",
  kind: "servicePoint",
  vendorName: "Campus Clinic",
  servicePointName: "Main desk",
  status: "Approved",
  expiresAt: "2026-06-23T10:05:00.000Z",
  completedAt: "2026-06-23T10:01:00.000Z",
  recordedAt: "2026-06-23T10:01:01.000Z",
};

describe("verification history helpers", () => {
  it("deduplicates by verification request and keeps newest records first", () => {
    const previous: VerificationHistoryItem[] = [
      baseItem,
      {
        ...baseItem,
        verificationRequestId: "verification-002",
        servicePointName: "Residence gate",
        recordedAt: "2026-06-23T10:03:00.000Z",
      },
    ];

    const updated = upsertVerificationHistory(previous, {
      ...baseItem,
      status: "Declined",
      failureCode: "CREDENTIAL_NOT_CURRENT",
      recordedAt: "2026-06-23T10:04:00.000Z",
    });

    expect(updated.map((item) => item.verificationRequestId)).toEqual([
      "verification-001",
      "verification-002",
    ]);
    expect(updated[0]).toMatchObject({
      status: "Declined",
      failureCode: "CREDENTIAL_NOT_CURRENT",
    });
  });

  it("drops malformed parsed entries and sorts valid entries", () => {
    const parsed = parseVerificationHistory([
      { ...baseItem, verificationRequestId: "older", recordedAt: "2026-06-23T10:01:00.000Z" },
      { ...baseItem, verificationRequestId: "newer", recordedAt: "2026-06-23T10:02:00.000Z" },
      { ...baseItem, verificationRequestId: "pending", status: "Pending" },
      { ...baseItem, verificationRequestId: "", recordedAt: "2026-06-23T10:03:00.000Z" },
    ]);

    expect(parsed.map((item) => item.verificationRequestId)).toEqual(["newer", "older"]);
  });
});

