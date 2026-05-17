import { render } from "@testing-library/react-native";

import { StudentCard } from "@/src/components/StudentCard";

describe("StudentCard", () => {
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
