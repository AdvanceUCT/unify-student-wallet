import type { ReactNode } from "react";

type SafeAreaContainerProps = {
  children?: ReactNode;
  style?: unknown;
};

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  const metrics = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 0, right: 0, bottom: 24, left: 0 },
  };

  return {
    SafeAreaProvider: ({ children }: SafeAreaContainerProps) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children, style }: SafeAreaContainerProps) => React.createElement(View, { style }, children),
    initialWindowMetrics: metrics,
    useSafeAreaFrame: () => metrics.frame,
    useSafeAreaInsets: () => metrics.insets,
  };
});
