import { Pressable, Text, View } from "react-native";

import { initialsFrom } from "@/src/lib/initials";
import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { shadows } from "@/src/theme/shadows";
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

export function formatCredentialDate(value: string | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "—";
}

export function StudentCard({ credential, onPress, width, issuerFallback }: StudentCardProps) {
  const attributes = credential.credentialAttributes;
  const firstName = findAttribute(attributes, "firstName", "first_name", "givenName");
  const lastName = findAttribute(attributes, "lastName", "last_name", "familyName", "surname");
  const studentNumber = findAttribute(attributes, "studentNumber", "student_number", "studentId");
  const faculty = findAttribute(attributes, "faculty", "school", "department", "programme", "program");
  const year = findAttribute(attributes, "year", "yearOfStudy", "academicYear");
  const university =
    findAttribute(attributes, "institution", "university", "issuerName", "issuer") ??
    credential.connectionLabel ??
    issuerFallback;
  const issuedAt = formatCredentialDate(
    findAttribute(attributes, "issuedAt", "issued_at", "validFrom", "valid_from", "issuanceDate"),
  );
  const expiresAt = formatCredentialDate(
    findAttribute(attributes, "expiresAt", "expires_at", "expiryDate", "expirationDate"),
  );

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
        borderRadius: radii.xl,
        overflow: "hidden",
        opacity: pressed ? 0.92 : 1,
        ...shadows.md,
      })}
    >
      <View
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={{
            color: colors.surface,
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 0.8,
            flex: 1,
            flexShrink: 1,
          }}
        >
          {university ? university.toUpperCase() : "UNIVERSITY PENDING"}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: colors.surface,
            fontSize: 11,
            fontWeight: "600",
            letterSpacing: 0.8,
            opacity: 0.85,
            flexShrink: 0,
          }}
        >
          STUDENT · ID
        </Text>
      </View>

      <View style={{ flex: 1, padding: spacing.lg, flexDirection: "row", gap: spacing.lg }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radii.pill,
            backgroundColor: colors.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: colors.primaryDeep,
              fontSize: 20,
              fontWeight: "700",
            }}
          >
            {initials || "—"}
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View style={{ gap: spacing.xs }}>
            <Text
              numberOfLines={1}
              style={[typography.heading, { fontSize: 20, lineHeight: 24 }]}
            >
              {hasHolder ? holderName : "Holder name pending"}
            </Text>
            <Text numberOfLines={1} style={typography.body}>
              {faculty ?? "Programme pending"}
            </Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: "row", gap: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Text style={typography.caption}>No.</Text>
                <Text ellipsizeMode="tail" numberOfLines={1} style={[typography.bodyStrong, { marginTop: 2 }]}>
                  {studentNumber ?? "—"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={typography.caption}>Year</Text>
                <Text ellipsizeMode="tail" numberOfLines={1} style={[typography.bodyStrong, { marginTop: 2 }]}>
                  {year ?? "—"}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Text style={typography.caption}>Issued</Text>
                <Text numberOfLines={1} style={[typography.bodyStrong, { fontSize: 13, marginTop: 2 }]}>
                  {issuedAt}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={typography.caption}>Expires</Text>
                <Text numberOfLines={1} style={[typography.bodyStrong, { fontSize: 13, marginTop: 2 }]}>
                  {expiresAt}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
