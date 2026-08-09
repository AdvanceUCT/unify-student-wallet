import { processColor } from "react-native";
import { render } from "@testing-library/react-native";

import { StudentCard } from "@/src/components/StudentCard";

describe("StudentCard", () => {
  it("shows only the essential identity and expiry information", () => {
    const screen = render(
      <StudentCard
        credential={{
          credentialAttributes: [
            { name: "firstName", value: "Ada" },
            { name: "lastName", value: "Lovelace" },
            { name: "institution", value: "University of Cape Town" },
            { name: "studentNumber", value: "STD-10001" },
            { name: "faculty", value: "Faculty of Engineering & the Built Environment" },
            { name: "programme", value: "BSc Computer Science" },
            { name: "year", value: "Third year" },
            { name: "issuedAt", value: "2026-04-27T10:00:00.000Z" },
            { name: "expiresAt", value: "2027-04-27T10:00:00.000Z" },
          ],
          connectionLabel: "Generic Issuer Connection",
          id: "credential-validity",
        }}
        width={320}
      />,
    );

    expect(screen.getByText("UNIVERSITY OF CAPE TOWN")).toBeTruthy();
    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("STD-10001")).toBeTruthy();
    expect(screen.getByText("2027-04-27")).toBeTruthy();
    expect(screen.queryByText("2026-04-27")).toBeNull();
    expect(screen.queryByText("BSc Computer Science")).toBeNull();
    expect(screen.queryByText("Third year")).toBeNull();
    expect(screen.queryByText("VERIFIABLE STUDENT IDENTITY")).toBeNull();
    expect(screen.queryByText("AL")).toBeNull();
    expect(screen.queryByText("DONE")).toBeNull();
    expect(screen.getByTestId("student-card-gradient").props.colors).toEqual([
      processColor("#342F60"),
      processColor("#5D5F99"),
    ]);
    expect(screen.getByTestId("student-card-contour")).toBeTruthy();
  });

  it("truncates long issuer and identifier values instead of letting them overflow", () => {
    const screen = render(
      <StudentCard
        credential={{
          credentialAttributes: [
            {
              name: "issuerName",
              value: "Extremely Long University Name That Should Not Break The Card Header",
            },
            { name: "studentNumber", value: "VERY-LONG-STUDENT-NUMBER-1234567890" },
            { name: "firstName", value: "Alexandra-Cassandra" },
            { name: "lastName", value: "Very-Long-Surname" },
          ],
          id: "credential-1",
        }}
        width={320}
      />,
    );

    expect(
      screen.getByText("EXTREMELY LONG UNIVERSITY NAME THAT SHOULD NOT BREAK THE CARD HEADER").props.numberOfLines,
    ).toBe(1);
    expect(screen.getByText("VERY-LONG-STUDENT-NUMBER-1234567890").props.numberOfLines).toBe(1);
    expect(screen.getByText("Alexandra-Cassandra Very-Long-Surname").props.numberOfLines).toBe(1);
  });

  it("normalizes signed expiry aliases and marks unavailable card values", () => {
    const dated = render(
      <StudentCard
        credential={{
          credentialAttributes: [
            { name: "valid_from", value: "2026-08-01T00:00:00.000Z" },
            { name: "expiration-date", value: "2027-08-01T00:00:00.000Z" },
          ],
          id: "credential-aliases",
        }}
        width={320}
      />,
    );

    expect(dated.queryByText("2026-08-01")).toBeNull();
    expect(dated.getByText("2027-08-01")).toBeTruthy();

    const missing = render(<StudentCard credential={{ id: "credential-missing-dates" }} width={320} />);
    expect(missing.getAllByText("—")).toHaveLength(2);
  });

  it("uses a restrained fallback gradient when faculty is unavailable", () => {
    const screen = render(<StudentCard credential={{ id: "credential-no-faculty" }} width={320} />);

    expect(screen.getByTestId("student-card-gradient").props.colors).toEqual([
      processColor("#293431"),
      processColor("#52615C"),
    ]);
  });
});
