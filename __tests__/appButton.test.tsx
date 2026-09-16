import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { AppButton } from "@/src/components/AppButton";

describe("AppButton", () => {
  it.each(["md", "lg"] as const)("keeps %s actions full height and lets labels wrap", (size) => {
    const onPress = jest.fn();
    const screen = render(<AppButton label="Start a new top-up" size={size} onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Start a new top-up" });
    const style = StyleSheet.flatten(button.props.style);
    expect(style.minHeight).toBe(size === "lg" ? 56 : 48);
    expect(style.flexShrink).toBe(0);
    const label = screen.getByText("Start a new top-up");
    expect(StyleSheet.flatten(label.props.style).color).toBe("#FFFFFF");
    expect(label.props.numberOfLines).toBeUndefined();
    expect(label.props.adjustsFontSizeToFit).toBeUndefined();
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps disabled actions labelled and prevents submission", () => {
    const onPress = jest.fn();
    const screen = render(<AppButton disabled label="Opening checkout..." onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Opening checkout..." });
    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
