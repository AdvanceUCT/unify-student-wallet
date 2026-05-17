import { Platform, type ViewStyle } from "react-native";

const ios = (opacity: number, radius: number, offsetY: number): ViewStyle => ({
  shadowColor: "#0F1411",
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: offsetY },
});

const android = (elevation: number): ViewStyle => ({ elevation });

export const shadows = {
  none: {} as ViewStyle,
  sm:
    Platform.select<ViewStyle>({
      ios: ios(0.06, 10, 4),
      android: android(2),
      default: {},
    }) ?? {},
  md:
    Platform.select<ViewStyle>({
      ios: ios(0.1, 18, 8),
      android: android(6),
      default: {},
    }) ?? {},
  lg:
    Platform.select<ViewStyle>({
      ios: ios(0.14, 24, 12),
      android: android(10),
      default: {},
    }) ?? {},
};
