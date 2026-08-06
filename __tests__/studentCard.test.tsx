import { render } from "@testing-library/react-native";

import { StudentCard } from "@/src/components/StudentCard";

describe("StudentCard", () => {
  it("shows the issuing university and credential validity dates", () => {
    const screen = render(
      <StudentCard
        credential={{
          credentialAttributes: [
            { name: "institution", value: "University of Cape Town" },
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
    expect(screen.getByText("2026-04-27")).toBeTruthy();
    expect(screen.getByText("2027-04-27")).toBeTruthy();
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
            { name: "year", value: "Postgraduate Extended Study Year" },
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
    expect(screen.getByText("Postgraduate Extended Study Year").props.numberOfLines).toBe(1);
  });
});
