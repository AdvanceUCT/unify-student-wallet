import * as mockReact from "react";
import type { ReactNode } from "react";
import { Text as mockText } from "react-native";
import { render } from "@testing-library/react-native";
import RootLayout from "@/app/_layout";

jest.mock("@tanstack/react-query", () => ({
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@expo-google-fonts/fraunces", () => ({
  useFonts: () => [true],
  Fraunces_600SemiBold: "Fraunces_600SemiBold",
  Fraunces_700Bold: "Fraunces_700Bold",
}));

jest.mock("@expo-google-fonts/ibm-plex-sans", () => ({
  useFonts: () => [true],
  IBMPlexSans_400Regular: "IBMPlexSans_400Regular",
  IBMPlexSans_500Medium: "IBMPlexSans_500Medium",
  IBMPlexSans_600SemiBold: "IBMPlexSans_600SemiBold",
}));

jest.mock("@expo-google-fonts/ibm-plex-mono", () => ({
  useFonts: () => [true],
  IBMPlexMono_400Regular: "IBMPlexMono_400Regular",
  IBMPlexMono_500Medium: "IBMPlexMono_500Medium",
}));

jest.mock("expo-router", () => ({
  Stack: () => mockReact.createElement(mockText, null, "stack-mounted"),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("@/src/features/wallet/WalletSessionProvider", () => ({
  WalletRouteGate: ({ children }: { children: ReactNode }) => children,
  WalletSessionProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/src/features/wallet/HolderAgentProvider", () => ({
  HolderAgentProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/src/features/wallet/AutoLockProvider", () => ({
  AutoLockProvider: ({ children }: { children: ReactNode }) =>
    mockReact.createElement(
      mockReact.Fragment,
      null,
      mockReact.createElement(mockText, null, "auto-lock-mounted"),
      children,
    ),
}));

describe("root layout", () => {
  it("mounts auto-lock around routed app content", () => {
    const screen = render(<RootLayout />);

    expect(screen.getByText("auto-lock-mounted")).toBeTruthy();
    expect(screen.getByText("stack-mounted")).toBeTruthy();
  });
});
