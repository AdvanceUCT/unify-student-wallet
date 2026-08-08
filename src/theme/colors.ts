import { Appearance } from "react-native";

export type ColorPalette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  ink: string;
  inkMuted: string;
  inkSubtle: string;
  primary: string;
  primaryDeep: string;
  primarySoft: string;
  focus: string;
  focusSoft: string;
  rule: string;
  ruleSoft: string;
  pill: string;
  pillInk: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  text: string;
  muted: string;
  border: string;
  white: string;
  camera: string;
  cameraInk: string;
};

export const lightColors: ColorPalette = {
  background: "#F4F7F5",
  surface: "#FFFFFF",
  surfaceAlt: "#EAF0ED",
  surfaceRaised: "#FFFFFF",
  ink: "#14201B",
  inkMuted: "#53615B",
  inkSubtle: "#7C8983",
  primary: "#176B4B",
  primaryDeep: "#0D3B2E",
  primarySoft: "#DDECE5",
  focus: "#2457D6",
  focusSoft: "#E2E9FC",
  rule: "#D6DFDA",
  ruleSoft: "#E7EDE9",
  pill: "#14201B",
  pillInk: "#FFFFFF",
  success: "#176B4B",
  successSoft: "#DDECE5",
  warning: "#9B5D09",
  warningSoft: "#F8E9C9",
  error: "#B83A32",
  errorSoft: "#F8DFDC",
  text: "#14201B",
  muted: "#53615B",
  border: "#D6DFDA",
  white: "#FFFFFF",
  camera: "#07100C",
  cameraInk: "#F4F7F5",
};

export const darkColors: ColorPalette = {
  background: "#0D1210",
  surface: "#151C19",
  surfaceAlt: "#1D2723",
  surfaceRaised: "#202A26",
  ink: "#F1F5F3",
  inkMuted: "#AAB6B0",
  inkSubtle: "#829089",
  primary: "#63C49B",
  primaryDeep: "#B8E8D3",
  primarySoft: "#203B30",
  focus: "#84A5FF",
  focusSoft: "#26365F",
  rule: "#33403A",
  ruleSoft: "#27322D",
  pill: "#F1F5F3",
  pillInk: "#101613",
  success: "#67CAA0",
  successSoft: "#1D3B2F",
  warning: "#F0B85E",
  warningSoft: "#44351F",
  error: "#F38B82",
  errorSoft: "#492724",
  text: "#F1F5F3",
  muted: "#AAB6B0",
  border: "#33403A",
  white: "#FFFFFF",
  camera: "#050806",
  cameraInk: "#F4F7F5",
};

export function currentColors() {
  return Appearance.getColorScheme() === "dark" ? darkColors : lightColors;
}

// Keep existing imports source-compatible while resolving every colour at render time.
export const colors = {} as ColorPalette;
for (const key of Object.keys(lightColors) as (keyof ColorPalette)[]) {
  Object.defineProperty(colors, key, {
    enumerable: true,
    get: () => currentColors()[key],
  });
}
