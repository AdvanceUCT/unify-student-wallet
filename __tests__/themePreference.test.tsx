import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Appearance, Pressable, Text, View } from "react-native";

import { ThemePreferenceProvider, themePreferenceTestInternals, useThemePalette, useThemePreference } from "@/src/features/theme/ThemePreferenceProvider";
import { darkColors, lightColors } from "@/src/theme/colors";

const mockGetSecureValue = jest.fn(async (_key: string): Promise<string | null> => null);
const mockSaveSecureValue = jest.fn(async (_key: string, _value: string) => undefined);

jest.mock("@/src/lib/storage/secureStore", () => ({
  getSecureValue: (key: string) => mockGetSecureValue(key),
  saveSecureValue: (key: string, value: string) => mockSaveSecureValue(key, value),
}));

function PreferenceProbe() {
  const colors = useThemePalette();
  const { preference, resolvedScheme, setPreference } = useThemePreference();
  return (
    <View>
      <Text testID="preference">{preference}</Text>
      <Text testID="resolved-scheme">{resolvedScheme}</Text>
      <Text testID="surface-color">{colors.surface}</Text>
      <Pressable accessibilityLabel="Choose light" onPress={() => void setPreference("light")}><Text>Light</Text></Pressable>
      <Pressable accessibilityLabel="Choose dark" onPress={() => void setPreference("dark")}><Text>Dark</Text></Pressable>
    </View>
  );
}

describe("theme preference", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSecureValue.mockResolvedValue("dark");
    jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it("hydrates and persists an explicit appearance choice", async () => {
    const screen = render(<ThemePreferenceProvider><PreferenceProbe /></ThemePreferenceProvider>);

    await waitFor(() => expect(screen.getByTestId("preference").props.children).toBe("dark"));
    expect(Appearance.setColorScheme).toHaveBeenCalledWith("dark");
    expect(screen.getByTestId("surface-color").props.children).toBe(darkColors.surface);

    fireEvent.press(screen.getByLabelText("Choose light"));
    expect(screen.getByTestId("preference").props.children).toBe("light");
    expect(screen.getByTestId("resolved-scheme").props.children).toBe("light");
    expect(screen.getByTestId("surface-color").props.children).toBe(lightColors.surface);
    await waitFor(() => expect(mockSaveSecureValue).toHaveBeenCalledWith(themePreferenceTestInternals.storageKey, "light"));
    expect(Appearance.setColorScheme).toHaveBeenLastCalledWith("light");
  });

  it("serializes rapid preference writes while immediately showing the final selection", async () => {
    let releaseFirstWrite!: () => void;
    mockSaveSecureValue
      .mockImplementationOnce(() => new Promise<undefined>((resolve) => { releaseFirstWrite = () => resolve(undefined); }))
      .mockResolvedValueOnce(undefined);
    const screen = render(<ThemePreferenceProvider><PreferenceProbe /></ThemePreferenceProvider>);
    await waitFor(() => expect(screen.getByTestId("preference").props.children).toBe("dark"));

    fireEvent.press(screen.getByLabelText("Choose light"));
    fireEvent.press(screen.getByLabelText("Choose dark"));
    expect(screen.getByTestId("preference").props.children).toBe("dark");
    expect(screen.getByTestId("surface-color").props.children).toBe(darkColors.surface);
    await waitFor(() => expect(mockSaveSecureValue).toHaveBeenCalledTimes(1));
    expect(mockSaveSecureValue).toHaveBeenLastCalledWith(themePreferenceTestInternals.storageKey, "light");

    await act(async () => { releaseFirstWrite(); });
    await waitFor(() => expect(mockSaveSecureValue).toHaveBeenCalledTimes(2));
    expect(mockSaveSecureValue).toHaveBeenLastCalledWith(themePreferenceTestInternals.storageKey, "dark");
  });

  it("defaults invalid stored values to the system theme", () => {
    expect(themePreferenceTestInternals.parseThemePreference("sepia")).toBe("system");
    expect(themePreferenceTestInternals.resolveScheme("system", "dark")).toBe("dark");
  });
});
