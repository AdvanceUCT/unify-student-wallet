import { Text, View } from "react-native";

import { Card } from "@/src/components/Card";
import { Tag } from "@/src/components/Tag";
import type { VerificationHistoryItem } from "@/src/features/verification/history";
import {
  formatVerificationHistoryDate,
  verificationHistoryTone,
} from "@/src/features/verification/historyDisplay";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type VerificationHistoryListProps = {
  items: VerificationHistoryItem[];
};

export function VerificationHistoryList({ items }: VerificationHistoryListProps) {
  return (
    <View style={{ gap: spacing.md }}>
      {items.map((item) => (
        <Card key={item.verificationRequestId} elevation="sm" style={{ borderRadius: 8 }}>
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <Text numberOfLines={1} style={[typography.bodyStrong, { flex: 1 }]}>
                {item.vendorName}
              </Text>
              <Tag label={item.status} tone={verificationHistoryTone(item.status)} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <Text numberOfLines={1} style={[typography.caption, { flex: 1 }]}>
                {item.servicePointName}
              </Text>
              <Text style={typography.caption}>
                {formatVerificationHistoryDate(item.completedAt ?? item.recordedAt)}
              </Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}
