import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { UnifiedActivityFeed } from "@/src/components/UnifiedActivityFeed";
import { normalizeWalletActivity } from "@/src/features/wallet/unifiedActivity";
import { lightColors } from "@/src/theme/colors";

describe("unified wallet activity", () => {
  it("replaces top-up references with student-readable status copy", () => {
    const [item] = normalizeWalletActivity([{
      amountMinor: 1_000,
      completedAt: "2026-09-15T12:00:00.000Z",
      createdAt: "2026-09-15T12:00:00.000Z",
      currency: "ZAR",
      direction: "CREDIT",
      id: "topup-001",
      reference: "unify-wlt-long-reference",
      status: "COMPLETED",
      title: "Wallet top-up",
      type: "TOPUP",
    }]);

    expect(item.subtitle).toBe("Wallet credited");
    expect(item.reference).toBe("unify-wlt-long-reference");
    expect(item.amountDirection).toBe("credit");
  });

  it("renders credits in green, debits in red, and uses compact sans amount type", () => {
    const items = normalizeWalletActivity([
      {
        amountMinor: 1_000,
        completedAt: "2026-09-15T12:00:00.000Z",
        createdAt: "2026-09-15T12:00:00.000Z",
        currency: "ZAR",
        direction: "CREDIT",
        id: "topup-001",
        status: "COMPLETED",
        title: "Wallet top-up",
        type: "TOPUP",
      },
      {
        amountMinor: 450,
        completedAt: "2026-09-15T11:00:00.000Z",
        createdAt: "2026-09-15T11:00:00.000Z",
        currency: "ZAR",
        direction: "DEBIT",
        id: "payment-001",
        status: "COMPLETED",
        subtitle: "Main Library",
        title: "Campus Coffee",
        type: "SPEND",
      },
    ]);
    const screen = render(<UnifiedActivityFeed compact items={items} />);

    const creditStyle = StyleSheet.flatten(screen.getByText("+R 10.00").props.style);
    const debitStyle = StyleSheet.flatten(screen.getByText("-R 4.50").props.style);
    expect(creditStyle.color).toBe(lightColors.success);
    expect(debitStyle.color).toBe(lightColors.error);
    expect(creditStyle.fontFamily).toBe("IBMPlexSans_600SemiBold");
    expect(creditStyle.fontSize).toBe(15);
  });
});
