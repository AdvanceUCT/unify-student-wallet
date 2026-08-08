import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Appearance, Pressable, Text } from "react-native";

import { ThemePreferenceProvider, themePreferenceTestInternals, useThemePreference } from "@/src/features/theme/ThemePreferenceProvider";

const mockGetSecureValue = jest.fn(async (_key: string): Promise<string | null> => null);
const mockSaveSecureValue = jest.fn(async (_key: string, _value: string) => undefined);

jest.mock("@/src/lib/storage/secureStore", () => ({
  getSecureValue: (key: string) => mockGetSecureValue(key),
  saveSecureValue: (key: string, value: string) => mockSaveSecureValue(key, value),
}));

function PreferenceProbe() {
  const { preference, setPreference } = useThemePreference();
  return <Pressable onPress={() => void setPreference("light")}><Text>{preference}</Text></Pressable>;
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

    await waitFor(() => expect(screen.getByText("dark")).toBeTruthy());
    expect(Appearance.setColorScheme).toHaveBeenCalledWith("dark");

    fireEvent.press(screen.getByText("dark"));
    await waitFor(() => expect(mockSaveSecureValue).toHaveBeenCalledWith(themePreferenceTestInternals.storageKey, "light"));
    expect(Appearance.setColorScheme).toHaveBeenLastCalledWith("light");
  });

  it("defaults invalid stored values to the system theme", () => {
    expect(themePreferenceTestInternals.parseThemePreference("sepia")).toBe("system");
  });
});
