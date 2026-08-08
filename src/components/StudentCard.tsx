import { IdCard } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { BrandGradient } from "@/src/components/BrandGradient";
import {
  credentialMetadata,
  formatCredentialDate,
  type CredentialAttribute,
  type CredentialMetadataSource,
} from "@/src/features/wallet/credentialMetadata";
import { colors } from "@/src/theme/colors";
import { radii } from "@/src/theme/radii";
import { shadows } from "@/src/theme/shadows";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export type CredentialLike = CredentialMetadataSource;
export type { CredentialAttribute };

type StudentCardProps = {
  credential: CredentialLike;
  onPress?: () => void;
  width: number;
  issuerFallback?: string;
};

export { formatCredentialDate };

export function StudentCard({ credential, onPress, width, issuerFallback }: StudentCardProps) {
  const metadata = credentialMetadata(credential);
  const {
    holderName,
    programme,
    studentNumber,
    year,
  } = metadata;
  const university = metadata.issuer ?? issuerFallback;
  const issuedAt = formatCredentialDate(metadata.issuedAt);
  const expiresAt = formatCredentialDate(metadata.expiresAt);

  return (
    <Pressable
      accessibilityLabel={`${university ?? "University"} student credential for ${holderName || "holder"}`}
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        aspectRatio: 1.48,
        backgroundColor: colors.primaryDeep,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: "#487665",
        overflow: "hidden",
        transform: [{ scale: pressed ? 0.985 : 1 }],
        opacity: pressed ? 0.94 : 1,
        ...shadows.md,
      })}
    >
      <BrandGradient style={{ flex: 1, padding: spacing.lg, justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
          <View style={{ width: 40, height: 40, borderRadius: radii.md, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
            <IdCard color={colors.white} size={21} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={[typography.eyebrow, { color: colors.white, fontSize: 12 }]}>{(university ?? "University credential").toUpperCase()}</Text>
            <Text style={[typography.caption, { color: "#D4E4DE", fontSize: 11 }]}>VERIFIABLE STUDENT IDENTITY</Text>
          </View>
        </View>

        <View style={{ gap: 3 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[typography.heading, { color: colors.white, fontSize: 22, lineHeight: 28 }]}>{holderName || "Holder name pending"}</Text>
          <Text numberOfLines={1} style={[typography.body, { color: "#E0ECE7", fontSize: 14 }]}>{programme ?? "Programme pending"}</Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.md }}>
            <View style={{ flex: 1 }}><Text style={[typography.caption, { color: "#BFD6CD", fontSize: 11 }]}>STUDENT NUMBER</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[typography.mono, { color: colors.white, fontSize: 14, marginTop: 2 }]}>{studentNumber ?? "—"}</Text></View>
            <View style={{ maxWidth: "42%" }}><Text style={[typography.caption, { color: "#BFD6CD", fontSize: 11 }]}>YEAR</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[typography.bodyStrong, { color: colors.white, marginTop: 2 }]}>{year ?? "—"}</Text></View>
          </View>
          <View style={{ flexDirection: "row", gap: spacing["2xl"], borderTopWidth: 1, borderColor: "rgba(255,255,255,0.22)", paddingTop: spacing.sm }}>
            <View><Text style={[typography.caption, { color: "#BFD6CD", fontSize: 11 }]}>ISSUED</Text><Text style={[typography.mono, { color: colors.white, fontSize: 12, marginTop: 2 }]}>{issuedAt}</Text></View>
            <View><Text style={[typography.caption, { color: "#BFD6CD", fontSize: 11 }]}>VALID TO</Text><Text style={[typography.mono, { color: colors.white, fontSize: 12, marginTop: 2 }]}>{expiresAt}</Text></View>
          </View>
        </View>
      </BrandGradient>
    </Pressable>
  );
}
