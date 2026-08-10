/**
 * @fileoverview Loads, applies, and persists the student's light, dark, or system theme choice.
 * @module features/theme/ThemePreferenceProvider
 */

import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Appearance, useColorScheme } from "react-native";

import { getSecureValue, saveSecureValue } from "@/src/lib/storage/secureStore";
import { currentColors, darkColors, lightColors, setActiveColorScheme, type ColorPalette } from "@/src/theme/colors";

export type ThemePreference = "system" | "light" | "dark";

type ThemePreferenceContextValue = {
  hydrated: boolean;
  colors: ColorPalette;
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

function resolveScheme(preference: ThemePreference, systemScheme: "light" | "dark" | null | undefined) {
  return preference === "system" ? systemScheme === "dark" ? "dark" as const : "light" as const : preference;
}

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [hydrated, setHydrated] = useState(false);
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolvedScheme, setResolvedScheme] = useState<"light" | "dark">(() => resolveScheme("system", systemScheme));
  const preferenceRef = useRef<ThemePreference>("system");
  const preferenceWriteQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    void getSecureValue(THEME_PREFERENCE_STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        const next = parseThemePreference(stored);
        applyThemePreference(next);
        const nextResolvedScheme = resolveScheme(next, Appearance.getColorScheme());
        setActiveColorScheme(nextResolvedScheme);
        preferenceRef.current = next;
        setPreferenceState(next);
        setResolvedScheme(nextResolvedScheme);
      })
      .catch(() => undefined)
      .finally(() => active && setHydrated(true));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (preferenceRef.current !== "system") return;
    const nextResolvedScheme = resolveScheme("system", systemScheme);
    setActiveColorScheme(nextResolvedScheme);
    setResolvedScheme(nextResolvedScheme);
  }, [systemScheme]);

  const setPreference = useCallback(async (next: ThemePreference) => {
    if (preferenceRef.current === next) return;
    applyThemePreference(next);
    const nextResolvedScheme = resolveScheme(next, Appearance.getColorScheme());
    setActiveColorScheme(nextResolvedScheme);
    preferenceRef.current = next;
    setPreferenceState(next);
    setResolvedScheme(nextResolvedScheme);

    const write = preferenceWriteQueueRef.current
      .catch(() => undefined)
      .then(() => saveSecureValue(THEME_PREFERENCE_STORAGE_KEY, next));
    preferenceWriteQueueRef.current = write.catch(() => undefined);
    await write;
  }, []);

  setActiveColorScheme(resolvedScheme);
  const palette = resolvedScheme === "dark" ? darkColors : lightColors;
  const value = useMemo(() => ({ colors: palette, hydrated, preference, resolvedScheme, setPreference }), [hydrated, palette, preference, resolvedScheme, setPreference]);

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const value = useContext(ThemePreferenceContext);
  if (!value) throw new Error("useThemePreference must be used within ThemePreferenceProvider.");
  return value;
}

export function useThemePalette() {
  return useContext(ThemePreferenceContext)?.colors ?? currentColors();
}

export const themePreferenceTestInternals = { applyThemePreference, parseThemePreference, resolveScheme, storageKey: THEME_PREFERENCE_STORAGE_KEY };
