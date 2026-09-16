import { render, within } from "@testing-library/react-native";
import { ScrollView, StyleSheet, Text } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";

describe("AppScreen", () => {
  it("scrolls actions after the body with clearance above the Android bottom inset", () => {
    const screen = render(
      <AppScreen footer={<Text>Footer action</Text>}>
        <Text>Body</Text>
      </AppScreen>,
    );

    const scroll = screen.UNSAFE_getByType(ScrollView);
    expect(within(scroll).getByText("Body")).toBeTruthy();
    expect(within(scroll).getByText("Footer action")).toBeTruthy();
    const footerStyle = StyleSheet.flatten(screen.getByTestId("app-screen-footer").props.style);
    expect(footerStyle.flex).toBeUndefined();
    expect(footerStyle.flexShrink).toBe(0);
    expect(footerStyle.paddingTop).toBe(24);
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom).toBe(40);
    expect(scroll.props.keyboardShouldPersistTaps).toBe("handled");
  });

  it("preserves custom padding on screens without actions", () => {
    const screen = render(<AppScreen contentContainerStyle={{ paddingBottom: 0 }}><Text>Body</Text></AppScreen>);
    expect(StyleSheet.flatten(screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle).paddingBottom).toBe(0);
    expect(screen.queryByTestId("app-screen-footer")).toBeNull();
  });
});
