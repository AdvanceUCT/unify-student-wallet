import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, useColorScheme } from "react-native";

import { getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";

export type ThemePreference = "system" | "light" | "dark";

type ThemePreferenceContextValue = {
  hydrated: boolean;
  preference: ThemePreference;
  resolvedScheme: "light" | "dark";
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const THEME_PREFERENCE_STORAGE_KEY = "unify.theme.preference.v1";
const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

function parseThemePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

function applyThemePreference(preference: ThemePreference) {
  Appearance.setColorScheme(preference === "system" ? null : preference);
}

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [hydrated, setHydrated] = useState(false);
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let active = true;
    void getSecureValue(THEME_PREFERENCE_STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        const next = parseThemePreference(stored);
        applyThemePreference(next);
        setPreferenceState(next);
      })
      .catch(() => undefined)
      .finally(() => active && setHydrated(true));
    return () => { active = false; };
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    applyThemePreference(next);
    setPreferenceState(next);
    await saveSecureValue(THEME_PREFERENCE_STORAGE_KEY, next);
  }, []);

  const resolvedScheme = preference === "system"
    ? systemScheme === "dark" ? "dark" : "light"
    : preference;
  const value = useMemo(() => ({ hydrated, preference, resolvedScheme, setPreference }), [hydrated, preference, resolvedScheme, setPreference]);

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const value = useContext(ThemePreferenceContext);
  if (!value) throw new Error("useThemePreference must be used within ThemePreferenceProvider.");
  return value;
}

export const themePreferenceTestInternals = { applyThemePreference, parseThemePreference, storageKey: THEME_PREFERENCE_STORAGE_KEY };
