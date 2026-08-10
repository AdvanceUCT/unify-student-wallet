import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Appearance, Pressable, Text, View } from "react-native";

import WalletLayout from "@/app/(wallet)/_layout";
import { ThemePreferenceProvider, useThemePreference } from "@/src/features/theme/ThemePreferenceProvider";
import { darkColors, lightColors } from "@/src/theme/colors";

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  const Tabs = ({ screenOptions }: { screenOptions: Record<string, unknown> }) => {
    const tabBarStyle = screenOptions.tabBarStyle as Record<string, string>;
    return React.createElement(
      View,
      null,
      React.createElement(Text, { testID: "tab-background" }, tabBarStyle.backgroundColor),
      React.createElement(Text, { testID: "tab-border" }, tabBarStyle.borderColor),
      React.createElement(Text, { testID: "tab-active" }, screenOptions.tabBarActiveTintColor),
    );
  };
  Tabs.Screen = () => null;
  return { Tabs };
});

jest.mock("@/src/lib/storage/secureStore", () => ({
  getSecureValue: jest.fn(async () => "light"),
  saveSecureValue: jest.fn(async () => undefined),
}));

function ThemeControl() {
  const { setPreference } = useThemePreference();
  return <Pressable accessibilityLabel="Use dark theme" onPress={() => void setPreference("dark")}><Text>Dark</Text></Pressable>;
}

describe("wallet navigation theme", () => {
  beforeEach(() => {
    jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it("updates bottom-navigation colors in the same theme change", async () => {
    const screen = render(
      <ThemePreferenceProvider>
        <View><WalletLayout /><ThemeControl /></View>
      </ThemePreferenceProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("tab-background").props.children).toBe(lightColors.surface));
    fireEvent.press(screen.getByLabelText("Use dark theme"));

    expect(screen.getByTestId("tab-background").props.children).toBe(darkColors.surface);
    expect(screen.getByTestId("tab-border").props.children).toBe(darkColors.rule);
    expect(screen.getByTestId("tab-active").props.children).toBe(darkColors.primary);
  });
});
