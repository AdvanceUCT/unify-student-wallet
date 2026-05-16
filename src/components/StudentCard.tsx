import { Pressable, Text, View } from "react-native";

import { initialsFrom } from "@/src/lib/initials";
import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { rules } from "@/src/theme/rules";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type CredentialAttribute = { name: string; value: string };

type CredentialLike = {
  id: string;
  credentialAttributes?: CredentialAttribute[];
  connectionLabel?: string;
};

type StudentCardProps = {
  credential: CredentialLike;
  onPress?: () => void;
  width: number;
  issuerFallback?: string;
};

function findAttribute(attributes: CredentialAttribute[] | undefined, ...names: string[]) {
  if (!attributes) return undefined;
  for (const name of names) {
    const match = attributes.find((attribute) => attribute.name === name)?.value;
    if (match) return match;
  }
  return undefined;
}

export function StudentCard({ credential, onPress, width, issuerFallback }: StudentCardProps) {
  const attributes = credential.credentialAttributes;
  const firstName = findAttribute(attributes, "firstName", "first_name", "givenName");
  const lastName = findAttribute(attributes, "lastName", "last_name", "familyName", "surname");
  const studentNumber = findAttribute(attributes, "studentNumber", "student_number", "studentId");
  const faculty = findAttribute(attributes, "faculty", "school", "department", "programme", "program");
  const year = findAttribute(attributes, "year", "yearOfStudy", "academicYear");
  const issuer =
    findAttribute(attributes, "issuerName", "issuer", "institution", "university") ??
    credential.connectionLabel ??
    issuerFallback;

  const holderName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const initials = initialsFrom(firstName, lastName);
  const hasHolder = Boolean(holderName);

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        aspectRatio: 1.586,
        backgroundColor: colors.surface,
        borderColor: colors.ink,
        borderWidth: rules.ink,
        borderRadius: radii.sm,
        overflow: "hidden",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.sm,
          borderBottomColor: colors.rule,
          borderBottomWidth: rules.ink,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={[typography.eyebrow, { color: colors.primary, flex: 1, flexShrink: 1, marginRight: spacing.md }]}
        >
          {issuer ? issuer.toUpperCase() : "ISSUER · NOT SET"}
        </Text>
        <Text numberOfLines={1} style={[typography.eyebrow, { color: colors.ink, flexShrink: 0 }]}>
          STUDENT · ID
        </Text>
      </View>

      <View style={{ flex: 1, padding: spacing.lg, flexDirection: "row", gap: spacing.lg }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderColor: colors.ink,
            borderWidth: rules.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={[typography.heading, { color: colors.ink }]}>{initials || "—"}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View style={{ gap: spacing.xs }}>
            <Text
              numberOfLines={1}
              style={[typography.heading, { color: colors.ink, fontSize: 20, lineHeight: 24 }]}
            >
              {hasHolder ? holderName : "Holder name pending"}
            </Text>
            <Text numberOfLines={1} style={typography.body}>
              {faculty ?? "Programme pending"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.lg }}>
            <View style={{ flex: 1 }}>
              <Text style={typography.eyebrow}>No.</Text>
              <Text ellipsizeMode="tail" numberOfLines={1} style={typography.mono}>
                {studentNumber ?? "—"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.eyebrow}>Year</Text>
              <Text ellipsizeMode="tail" numberOfLines={1} style={typography.mono}>
                {year ?? "—"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
