import { act, fireEvent, render } from "@testing-library/react-native";

import { ActivityLedger, activityDateLabel } from "@/src/components/ActivityLedger";
import { CredentialCarousel } from "@/src/components/CredentialCarousel";
import { TrustSeal } from "@/src/components/TrustSeal";
import type { VerificationActivityRecord } from "@/src/features/verification/activityHistory";

let mockReducedMotion = false;

jest.mock("expo-haptics", () => ({
  NotificationFeedbackType: { Success: "success", Warning: "warning" },
  notificationAsync: jest.fn(async () => undefined),
}));

jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated/mock");
  return {
    ...actual,
    ReduceMotion: { System: "system" },
    useReducedMotion: () => mockReducedMotion,
    withDelay: (_delay: number, value: unknown) => value,
  };
});

const credentials = [
  {
    id: "student-id",
    connectionLabel: "UCT Registrar",
    credentialAttributes: [
      { name: "institution", value: "University of Cape Town" },
      { name: "firstName", value: "Alex" },
      { name: "lastName", value: "Student" },
    ],
  },
  {
    id: "campus-access",
    connectionLabel: "UCT Campus Services",
    credentialAttributes: [
      { name: "institution", value: "UCT Campus Services" },
      { name: "firstName", value: "Alex" },
      { name: "lastName", value: "Student" },
    ],
  },
];

function record(overrides: Partial<VerificationActivityRecord>): VerificationActivityRecord {
  return {
    id: "activity-1",
    walletId: "wallet-1",
    proofExchangeId: "proof-1",
    verifierName: "Campus Library",
    servicePointName: "Main entrance",
    status: "Approved",
    disclosedValues: [{ name: "Enrolment status", value: "Active" }],
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("civic trust components", () => {
  const haptics = jest.requireMock("expo-haptics") as { notificationAsync: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockReducedMotion = false;
  });

  it("only exposes a credential peek and position when multiple real credentials exist", () => {
    const single = render(<CredentialCarousel credentials={[credentials[0]]} />);
    fireEvent(single.getByTestId("credential-carousel"), "layout", { nativeEvent: { layout: { width: 360 } } });
    expect(single.queryByText("1 / 1")).toBeNull();
    single.unmount();

    const multiple = render(<CredentialCarousel accessibilityLabel="Student credentials" credentials={credentials} />);
    fireEvent(multiple.getByTestId("credential-carousel"), "layout", { nativeEvent: { layout: { width: 360 } } });
    expect(multiple.getByText("1 / 2")).toBeTruthy();
    fireEvent(multiple.getByTestId("credential-carousel-list"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(multiple.getByText("2 / 2")).toBeTruthy();
  });

  it("groups activity into Today and Yesterday and preserves expandable values", () => {
    const now = new Date("2026-08-08T12:00:00.000Z");
    const yesterday = new Date("2026-08-07T12:00:00.000Z");
    expect(activityDateLabel(now.toISOString(), now)).toBe("Today");
    expect(activityDateLabel(yesterday.toISOString(), now)).toBe("Yesterday");

    const screen = render(<ActivityLedger records={[record({ occurredAt: new Date().toISOString() })]} />);
    fireEvent.press(screen.getByLabelText("Campus Library, Main entrance, Approved"));
    expect(screen.getByText("Enrolment status")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("completes the lock-to-check seal at 560 ms with one success haptic", () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    render(<TrustSeal haptic lockToCheck onAnimationComplete={onComplete} state="success" />);

    act(() => jest.advanceTimersByTime(300));
    expect(haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(260));
    expect(onComplete).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it("skips seal timing when reduced motion is enabled", () => {
    mockReducedMotion = true;
    const onComplete = jest.fn();
    render(<TrustSeal haptic lockToCheck onAnimationComplete={onComplete} state="success" />);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });
});
