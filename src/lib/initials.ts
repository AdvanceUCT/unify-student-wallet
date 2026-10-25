/**
 * @fileoverview Derives safe display initials from optional student names.
 * @module lib/initials
 */

export function initialsFrom(first?: string, last?: string): string {
  const f = first?.trim()?.[0] ?? "";
  const l = last?.trim()?.[0] ?? "";
  const combined = (f + l).toUpperCase();
  return combined || "?";
}
