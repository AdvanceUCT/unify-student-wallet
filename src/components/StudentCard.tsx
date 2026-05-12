import { Pressable, Text, View } from "react-native";

import { initialsFrom } from "@/src/lib/initials";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";

import { StatusPill } from "./StatusPill";

type CredentialAttribute = { name: string; value: string };

type CredentialLike = {
  id: string;
  credentialAttributes?: CredentialAttribute[];
};

type StudentCardProps = {
  credential: CredentialLike;
  onPress?: () => void;
  width: number;
};

const DARK_TEAL = "#0E3F34";
const WHITE_50 = "rgba(255, 255, 255, 0.55)";
const WHITE_15 = "rgba(255, 255, 255, 0.15)";

function findAttribute(attributes: CredentialAttribute[] | undefined, name: string) {
  return attributes?.find((attribute) => attribute.name === name)?.value;
}

export function StudentCard({ credential, onPress, width }: StudentCardProps) {
  const attributes = credential.credentialAttributes;
  const firstName = findAttribute(attributes, "firstName");
  const lastName = findAttribute(attributes, "lastName");
  const studentNumber = findAttribute(attributes, "studentNumber") ?? "-";
  const faculty = findAttribute(attributes, "faculty") ?? "-";
  const year = findAttribute(attributes, "year") ?? "-";
  const holderName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Unknown holder";
  const initials = initialsFrom(firstName, lastName);

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        aspectRatio: 1.586,
        backgroundColor: colors.primary,
        borderRadius: 16,
        overflow: "hidden",
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ height: 8, backgroundColor: DARK_TEAL }} />

      <View style={{ flex: 1, padding: spacing.lg, justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text
            style={{
              color: colors.white,
              fontSize: 11,
              fontWeight: "800",
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            Unify University
          </Text>
          <StatusPill label="active" tone="success" />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: DARK_TEAL, fontSize: 20, fontWeight: "800" }}>{initials}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              numberOfLines={1}
              style={{ color: colors.white, fontSize: 22, fontWeight: "800" }}
            >
              {holderName}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: colors.primarySoft, fontSize: 14, fontWeight: "600" }}
            >
              {faculty}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
          <View style={{ gap: 2 }}>
            <Text
              style={{
                color: WHITE_50,
                fontSize: 10,
                fontWeight: "800",
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              Student no.
            </Text>
            <Text style={{ color: colors.white, fontSize: 20, fontWeight: "700", letterSpacing: 1 }}>
              {studentNumber}
            </Text>
            <View
              style={{
                marginTop: 6,
                alignSelf: "flex-start",
                backgroundColor: WHITE_15,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <Text style={{ color: colors.white, fontSize: 11, fontWeight: "700" }}>{`Year ${year}`}</Text>
            </View>
          </View>

          <View style={{ gap: 3, alignItems: "flex-end" }}>
            <View
              style={{
                width: 36,
                height: 10,
                borderRadius: 2,
                backgroundColor: colors.primarySoft,
              }}
            />
            <View
              style={{
                width: 36,
                height: 10,
                borderRadius: 2,
                backgroundColor: colors.primarySoft,
              }}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
