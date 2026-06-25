import { fireEvent, render } from "@testing-library/react-native";

import VerificationResultScreen from "@/app/(wallet)/verification-result";

const mockReplace = jest.fn();
const mockUseLocalSearchParams = jest.fn(() => ({
  studentName: "Thandiwe Nkosi",
  faculty: "Faculty of Science",
  validUntil: "2026-12-31",
  vendorId: "vendor-001",
  servicePointId: "service-point-007",
  verifiedAt: "2026-06-24T10:30:00.000Z",
}));

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: (...args: unknown[]) => mockReplace(...args) },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

describe("verification result screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("displays the verified student's credential details", () => {
    const screen = render(<VerificationResultScreen />);

    expect(screen.getByText("Identity confirmed.")).toBeTruthy();
    expect(screen.getByText("Thandiwe Nkosi")).toBeTruthy();
    expect(screen.getByText("Faculty of Science")).toBeTruthy();
    expect(screen.getByText("2026-12-31")).toBeTruthy();
    expect(screen.getByText("vendor-001")).toBeTruthy();
  });

  it("navigates back to the wallet home when Done is pressed", () => {
    const screen = render(<VerificationResultScreen />);

    fireEvent.press(screen.getByText("Done"));

    expect(mockReplace).toHaveBeenCalledWith("/(wallet)/home");
  });
});
