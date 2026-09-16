import { render } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";

describe("AppScreen", () => {
  it("keeps footer content above the mocked Android bottom inset", () => {
    const screen = render(
      <AppScreen footer={<Text>Footer action</Text>}>
        <Text>Body</Text>
      </AppScreen>,
    );

    const footerStyle = StyleSheet.flatten(screen.getByTestId("app-screen-footer").props.style);
    expect(footerStyle.paddingBottom).toBe(36);
  });
});
