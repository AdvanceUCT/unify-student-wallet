/**
 * @fileoverview Formats credential labels, values, and dates for wallet screens.
 * @module features/wallet/credentialDisplay
 */

const ATTRIBUTE_LABELS: Record<string, string> = {
  academicYear: "Academic year",
  dateOfBirth: "Date of birth",
  expiresAt: "Valid to",
  expirationDate: "Valid to",
  faculty: "Faculty",
  firstName: "First name",
  givenName: "First name",
  institution: "Institution",
  issueDate: "Issued",
  issuedAt: "Issued",
  issuerName: "Issuer",
  lastName: "Last name",
  programme: "Programme",
  studentNumber: "Student number",
  validFrom: "Valid from",
  validTo: "Valid to",
  yearOfStudy: "Year of study",
};

const DATE_LABEL_PATTERN = /(^|\s)(date|issued|issue date|valid from|valid to|expires|expiration|date of birth)($|\s)/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const DISPLAY_LOCALE = "en-ZA";

export function formatCredentialLabel(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "Value";
  return ATTRIBUTE_LABELS[trimmed]
    ?? trimmed
      .replace(/[_-]+/g, " ")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .replace(/^./, (character) => character.toUpperCase());
}

function hasMeaningfulTime(value: string) {
  const match = value.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return false;
  return match[1] !== "00" || match[2] !== "00" || (match[3] ?? "00") !== "00";
}

export function formatCredentialValue(name: string, value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "Not provided";

  const label = formatCredentialLabel(name);
  if (!DATE_LABEL_PATTERN.test(label) || !ISO_DATE_PATTERN.test(trimmed)) return trimmed;

  const date = new Date(trimmed.length === 10 ? `${trimmed}T00:00:00` : trimmed);
  if (!Number.isFinite(date.getTime())) return trimmed;

  const dateLabel = date.toLocaleDateString(DISPLAY_LOCALE, { day: "2-digit", month: "short", year: "numeric" });
  if (!hasMeaningfulTime(trimmed)) return dateLabel;
  return `${dateLabel}, ${date.toLocaleTimeString(DISPLAY_LOCALE, { hour: "2-digit", hourCycle: "h23", minute: "2-digit" })}`;
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString(DISPLAY_LOCALE, {
    day: "2-digit",
    hourCycle: "h23",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
