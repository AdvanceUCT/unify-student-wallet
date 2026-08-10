export type FacultyCardTheme = {
  key:
    | "ched"
    | "commerce"
    | "engineering"
    | "graduate-business"
    | "health-sciences"
    | "humanities"
    | "law"
    | "science"
    | "unknown";
  gradient: readonly [string, string];
};

const facultyThemes: Record<FacultyCardTheme["key"], FacultyCardTheme> = {
  commerce: { key: "commerce", gradient: ["#173B63", "#2F6F9F"] },
  engineering: { key: "engineering", gradient: ["#342F60", "#5D5F99"] },
  "health-sciences": { key: "health-sciences", gradient: ["#5C213A", "#94465F"] },
  humanities: { key: "humanities", gradient: ["#4B2B5C", "#79518A"] },
  law: { key: "law", gradient: ["#5D252C", "#914149"] },
  science: { key: "science", gradient: ["#16465E", "#2B7288"] },
  "graduate-business": { key: "graduate-business", gradient: ["#3B3328", "#706047"] },
  ched: { key: "ched", gradient: ["#35424B", "#5E707C"] },
  unknown: { key: "unknown", gradient: ["#293431", "#52615C"] },
};

function normalizedFaculty(value: string | undefined) {
  return value?.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim() ?? "";
}

export function facultyCardTheme(value: string | undefined): FacultyCardTheme {
  const faculty = normalizedFaculty(value);

  if (!faculty) return facultyThemes.unknown;
  if (faculty.includes("graduate school of business") || faculty === "gsb") return facultyThemes["graduate-business"];
  if (faculty.includes("health science") || faculty.includes("medicine")) return facultyThemes["health-sciences"];
  if (faculty.includes("engineering") || faculty.includes("built environment") || faculty === "ebe") return facultyThemes.engineering;
  if (faculty.includes("higher education development") || faculty === "ched") return facultyThemes.ched;
  if (faculty.includes("commerce") || faculty.includes("business")) return facultyThemes.commerce;
  if (faculty.includes("humanit")) return facultyThemes.humanities;
  if (faculty === "law" || faculty.includes("faculty of law")) return facultyThemes.law;
  if (faculty.includes("science")) return facultyThemes.science;

  return facultyThemes.unknown;
}
