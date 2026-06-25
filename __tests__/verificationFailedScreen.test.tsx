import { fireEvent, render } from "@testing-library/react-native";

import VerificationFailedScreen from "@/app/(wallet)/verification-failed";
import type { VerificationFailureReason } from "@/src/lib/api/verification";

const mockReplace = jest.fn();
let mockParams: { reason: VerificationFailureReason; vendorId: string; servicePointId: string } = {
  reason: "unknown",
  vendorId: "vendor-001",
  servicePointId: "service-point-007",
};

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: (...args: unknown[]) => mockReplace(...args) },
  useLocalSearchParams: () => mockParams,
}));

describe("verification failed screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each<[VerificationFailureReason, string]>([
    ["network_error", "Couldn't reach the verification service."],
    ["credential_revoked", "Credential revoked."],
    ["credential_expired", "Credential expired."],
    ["credential_not_found", "Credential not found."],
    ["unknown", "Verification failed."],
  ])("renders the correct title for reason %s", (reason, expectedTitle) => {
    mockParams = { reason, vendorId: "vendor-001", servicePointId: "service-point-007" };

    const screen = render(<VerificationFailedScreen />);

    expect(screen.getByText(expectedTitle)).toBeTruthy();
  });

  it("shows vendor and service point details", () => {
    mockParams = { reason: "credential_expired", vendorId: "vendor-001", servicePointId: "service-point-007" };

    const screen = render(<VerificationFailedScreen />);

    expect(screen.getByText("vendor-001")).toBeTruthy();
    expect(screen.getByText("service-point-007")).toBeTruthy();
  });

  it("navigates to the scanner when Scan again is pressed", () => {
    mockParams = { reason: "unknown", vendorId: "vendor-001", servicePointId: "service-point-007" };

    const screen = render(<VerificationFailedScreen />);

    fireEvent.press(screen.getByText("Scan again"));

    expect(mockReplace).toHaveBeenCalledWith("/(wallet)/scan");
  });

  it("navigates back to the wallet home when Done is pressed", () => {
    mockParams = { reason: "unknown", vendorId: "vendor-001", servicePointId: "service-point-007" };

    const screen = render(<VerificationFailedScreen />);

    fireEvent.press(screen.getByText("Done"));

    expect(mockReplace).toHaveBeenCalledWith("/(wallet)/home");
  });
});
