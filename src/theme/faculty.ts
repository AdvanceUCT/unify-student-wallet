import { darkColors, lightColors } from "@/src/theme/colors";

const facultyAccents = ["#2667A8", "#8B4E78", "#A35F18", "#33705A", "#7957A5", "#A24045"];

export function facultyAccent(value: string | undefined, dark = false) {
  if (!value) return dark ? darkColors.primary : lightColors.primary;
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return facultyAccents[Math.abs(hash) % facultyAccents.length];
}
