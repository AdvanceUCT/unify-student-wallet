import { ActivityIndicator, Text, View } from "react-native";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type LoadingStateProps = {
  eyebrow?: string;
  heading?: string;
  body?: string;
};

export function LoadingState({ eyebrow, heading, body }: LoadingStateProps) {
  return (
    <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing["2xl"] }}>
      <ActivityIndicator color={colors.primary} size="large" />
      {eyebrow ? <Text style={[typography.eyebrow, { textAlign: "center" }]}>{eyebrow}</Text> : null}
      {heading ? <Text style={[typography.heading, { textAlign: "center" }]}>{heading}</Text> : null}
      {body ? <Text style={[typography.body, { textAlign: "center" }]}>{body}</Text> : null}
    </View>
  );
}
