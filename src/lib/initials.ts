export function initialsFrom(first?: string, last?: string): string {
  const f = first?.trim()?.[0] ?? "";
  const l = last?.trim()?.[0] ?? "";
  const combined = (f + l).toUpperCase();
  return combined || "?";
}
