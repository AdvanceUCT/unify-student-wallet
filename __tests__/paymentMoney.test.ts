import { formatZarMinor, parseZarAmount } from "@/src/features/payment/money";

describe("payment money", () => {
  it.each([
    ["45", 4500],
    ["45.7", 4570],
    ["45.75", 4575],
    ["00045.05", 4505],
    ["0.01", 1],
  ])("parses %s exactly into integer cents", (value, amountMinor) => {
    expect(parseZarAmount(value)).toEqual({ ok: true, amountMinor });
  });

  it.each([
    ["", "Enter an amount."],
    ["0", "Amount must be at least R 0.01."],
    ["-1", "Use a valid amount with no more than two decimal places."],
    ["1.234", "Use a valid amount with no more than two decimal places."],
    ["1,25", "Use a valid amount with no more than two decimal places."],
    ["90071992547410", "Amount is too large."],
  ])("rejects invalid amount %s", (value, error) => {
    expect(parseZarAmount(value)).toEqual({ ok: false, error });
  });

  it("formats cents as ZAR without changing the amount", () => {
    expect(formatZarMinor(4505)).toBe("R 45.05");
    expect(formatZarMinor(123456789)).toBe("R 1 234 567.89");
  });

  it("applies optional top-up limits without changing ordinary parsing", () => {
    expect(parseZarAmount("9.99", { minMinor: 1000, maxMinor: 500000 })).toEqual({
      ok: false,
      error: "Minimum amount is R 10.00.",
    });
    expect(parseZarAmount("5000.01", { minMinor: 1000, maxMinor: 500000 })).toEqual({
      ok: false,
      error: "Maximum amount is R 5 000.00.",
    });
    expect(parseZarAmount("10", { minMinor: 1000, maxMinor: 500000 })).toEqual({
      ok: true,
      amountMinor: 1000,
    });
  });
});
