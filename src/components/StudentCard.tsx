import { IdCard, ShieldCheck } from "lucide-react-native";
import { Pressable, Text, useColorScheme, View } from "react-native";

import { initialsFrom } from "@/src/lib/initials";
import { colors } from "@/src/theme/colors";
import { facultyAccent } from "@/src/theme/faculty";
import { radii } from "@/src/theme/radii";
import { shadows } from "@/src/theme/shadows";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type CredentialAttribute = { name: string; value: string };

export type CredentialLike = {
  id: string;
  state?: string;
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
  const dark = useColorScheme() === "dark";
  const attributes = credential.credentialAttributes;
  const firstName = findAttribute(attributes, "firstName", "first_name", "givenName");
  const lastName = findAttribute(attributes, "lastName", "last_name", "familyName", "surname");
  const studentNumber = findAttribute(attributes, "studentNumber", "student_number", "studentId");
  const faculty = findAttribute(attributes, "faculty", "school", "department");
  const programme = findAttribute(attributes, "programme", "program") ?? faculty;
  const year = findAttribute(attributes, "year", "yearOfStudy", "academicYear");
  const university = findAttribute(attributes, "institution", "university", "issuerName", "issuer") ?? credential.connectionLabel ?? issuerFallback;
  const issuedAt = formatCredentialDate(findAttribute(attributes, "issuedAt", "issued_at", "validFrom", "valid_from", "issuanceDate"));
  const expiresAt = formatCredentialDate(findAttribute(attributes, "expiresAt", "expires_at", "expiryDate", "expirationDate"));
  const holderName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const accent = facultyAccent(faculty ?? programme, dark);

  return (
    <Pressable
      accessibilityLabel={`${university ?? "University"} student credential for ${holderName || "holder"}`}
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        aspectRatio: 1.48,
        backgroundColor: colors.surfaceRaised,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.rule,
        overflow: "hidden",
        transform: [{ scale: pressed ? 0.985 : 1 }],
        opacity: pressed ? 0.94 : 1,
        ...shadows.md,
      })}
    >
      <View style={{ height: 9, backgroundColor: accent }} />
      <View style={{ position: "absolute", right: -18, top: 18, width: 132, height: 132, borderRadius: radii.pill, borderWidth: 22, borderColor: accent, opacity: dark ? 0.12 : 0.08 }} />
      <View style={{ flex: 1, padding: spacing.lg, justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
          <View style={{ width: 38, height: 38, borderRadius: radii.md, backgroundColor: accent, alignItems: "center", justifyContent: "center" }}>
            <IdCard color={colors.white} size={21} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[typography.eyebrow, { color: accent }]}>{(university ?? "University credential").toUpperCase()}</Text>
            <Text style={[typography.caption, { color: colors.inkMuted }]}>VERIFIABLE STUDENT IDENTITY</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 2 }}><ShieldCheck color={accent} size={21} strokeWidth={1.7} /><Text style={[typography.caption, { color: accent, fontSize: 10 }]}>{(credential.state ?? "active").toUpperCase()}</Text></View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 54, height: 54, borderRadius: radii.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: accent, alignItems: "center", justifyContent: "center" }}>
            <Text style={[typography.heading, { color: accent }]}>{initialsFrom(firstName, lastName) || "—"}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={[typography.heading, { fontSize: 19 }]}>{holderName || "Holder name pending"}</Text>
            <Text numberOfLines={1} style={typography.body}>{programme ?? "Programme pending"}</Text>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.md }}>
            <View style={{ flex: 1 }}><Text style={typography.caption}>STUDENT NUMBER</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[typography.mono, { marginTop: 2 }]}>{studentNumber ?? "—"}</Text></View>
            <View style={{ maxWidth: "42%" }}><Text style={typography.caption}>YEAR</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[typography.bodyStrong, { marginTop: 2 }]}>{year ?? "—"}</Text></View>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.xl }}>
            <View><Text style={typography.caption}>ISSUED</Text><Text style={[typography.mono, { fontSize: 11, marginTop: 2 }]}>{issuedAt}</Text></View>
            <View><Text style={typography.caption}>VALID TO</Text><Text style={[typography.mono, { fontSize: 11, marginTop: 2 }]}>{expiresAt}</Text></View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
