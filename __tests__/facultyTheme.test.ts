import { facultyCardTheme } from "@/src/theme/faculty";

describe("facultyCardTheme", () => {
  it.each([
    ["Faculty of Commerce", "commerce"],
    ["Engineering & the Built Environment", "engineering"],
    ["EBE", "engineering"],
    ["Faculty of Health Sciences", "health-sciences"],
    ["Humanities", "humanities"],
    ["Faculty of Law", "law"],
    ["Science", "science"],
    ["Graduate School of Business", "graduate-business"],
    ["CHED", "ched"],
  ])("maps %s to the %s card theme", (faculty, expected) => {
    expect(facultyCardTheme(faculty).key).toBe(expected);
  });

  it("uses the same graphite fallback for missing and unknown faculties", () => {
    expect(facultyCardTheme(undefined)).toEqual(facultyCardTheme("Campus Access"));
  });
});
