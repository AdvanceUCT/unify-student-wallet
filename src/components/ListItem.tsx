import { type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type ListItemProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  disabled?: boolean;
};

export function ListItem({
  eyebrow,
  title,
  subtitle,
  meta,
  trailing,
  onPress,
  showChevron,
  disabled,
}: ListItemProps) {
  const interactive = Boolean(onPress) && !disabled;

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.md,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        {eyebrow ? <Text style={typography.eyebrow}>{eyebrow}</Text> : null}
        <Text style={typography.bodyStrong}>{title}</Text>
        {subtitle ? <Text style={typography.body}>{subtitle}</Text> : null}
      </View>
      {meta ? <Text style={typography.caption}>{meta}</Text> : null}
      {trailing}
      {showChevron ? <ChevronRight color={colors.inkSubtle} size={20} strokeWidth={1.5} /> : null}
    </View>
  );

  if (!interactive) {
    return <View style={{ opacity: disabled ? 0.5 : 1 }}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  );
}
