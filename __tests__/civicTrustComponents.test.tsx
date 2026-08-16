import { StyleSheet, View } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";

import { ActivityLedger, activityDateLabel } from "@/src/components/ActivityLedger";
import { CredentialCarousel } from "@/src/components/CredentialCarousel";
import { StatusPill } from "@/src/components/StatusPill";
import { Tag } from "@/src/components/Tag";
import { TrustSeal } from "@/src/components/TrustSeal";
import type { VerificationActivityRecord } from "@/src/features/verification/activityHistory";
import { darkColors, lightColors, setActiveColorScheme } from "@/src/theme/colors";

let mockReducedMotion = false;

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success", Warning: "warning" },
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
}));

jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated/mock");
  return {
    ...actual,
    cancelAnimation: jest.fn(),
    ReduceMotion: { Never: "never", System: "system" },
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
    expect(StyleSheet.flatten(single.getByTestId("credential-carousel").props.style).height).toBeCloseTo(360 / 1.72);
    expect(StyleSheet.flatten(single.getByTestId("credential-carousel-list").props.style).height).toBeCloseTo(360 / 1.72);
    expect(single.queryByText("1 / 1")).toBeNull();
    single.unmount();

    const multiple = render(<CredentialCarousel accessibilityLabel="Student credentials" credentials={credentials} />);
    fireEvent(multiple.getByTestId("credential-carousel"), "layout", { nativeEvent: { layout: { width: 360 } } });
    expect(StyleSheet.flatten(multiple.getByTestId("credential-carousel").props.style).height).toBeCloseTo(360 / 1.72);
    expect(StyleSheet.flatten(multiple.getByTestId("credential-carousel-list").props.style).height).toBeCloseTo((360 - 52) / 1.72);
    expect(multiple.getByTestId("credential-page-indicator").props.accessibilityLabel).toBe("Credential 1 of 2");
    expect(multiple.getByTestId("credential-page-dot-0")).toBeTruthy();
    expect(multiple.getByTestId("credential-page-dot-1")).toBeTruthy();
    fireEvent(multiple.getByTestId("credential-carousel-list"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(multiple.getByTestId("credential-page-indicator").props.accessibilityLabel).toBe("Credential 2 of 2");
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

  it("keeps the protocol status and exposes an exact revoked outcome", () => {
    const screen = render(<ActivityLedger records={[record({ failureCode: "CREDENTIAL_NOT_CURRENT", status: "Declined" })]} />);

    expect(screen.getByText("Declined")).toBeTruthy();
    expect(screen.getByText("Credential revoked")).toBeTruthy();
  });

  it("uses readable success colors for Approved in dark mode", () => {
    setActiveColorScheme("dark");
    const screen = render(<StatusPill label="Approved" tone="success" />);
    const label = screen.getByText("Approved");

    expect(StyleSheet.flatten(label.props.style).color).toBe(darkColors.success);
    expect(StyleSheet.flatten(screen.UNSAFE_getByType(View).props.style).backgroundColor).toBe(darkColors.successSoft);
    setActiveColorScheme("light");
  });

  it("uses readable primary tag colors in light and dark modes", () => {
    for (const [scheme, palette] of [["light", lightColors], ["dark", darkColors]] as const) {
      setActiveColorScheme(scheme);
      const screen = render(<Tag label="University of Cape Town" tone="primary" />);

      expect(StyleSheet.flatten(screen.getByText("University of Cape Town").props.style).color).toBe(palette.primary);
      expect(StyleSheet.flatten(screen.UNSAFE_getByType(View).props.style).backgroundColor).toBe(palette.primarySoft);
      screen.unmount();
    }
    setActiveColorScheme("light");
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

  it("exposes secure work as progress until it resolves", () => {
    const reanimated = jest.requireMock("react-native-reanimated") as { cancelAnimation: jest.Mock };
    const screen = render(<TrustSeal busy state="secure" />);

    expect(screen.getByLabelText("secure operation in progress").props.accessibilityRole).toBe("progressbar");

    const cancellationsBeforeResolution = reanimated.cancelAnimation.mock.calls.length;
    screen.rerender(<TrustSeal state="success" />);
    expect(screen.getByLabelText("success status").props.accessibilityRole).toBe("image");
    expect(screen.queryByLabelText("secure operation in progress")).toBeNull();
    expect(reanimated.cancelAnimation.mock.calls.length).toBeGreaterThan(cancellationsBeforeResolution);

    const cancellationsBeforeUnmount = reanimated.cancelAnimation.mock.calls.length;
    screen.unmount();
    expect(reanimated.cancelAnimation.mock.calls.length).toBeGreaterThan(cancellationsBeforeUnmount);
  });
});
