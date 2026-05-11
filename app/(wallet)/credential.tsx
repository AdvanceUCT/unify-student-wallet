import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { StatusPill } from "@/src/components/StatusPill";
import { getStoredCredentials } from "@/src/features/wallet/holderAgent";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const ISSUER_LABEL = "UNIFY Issuer Service";
const KNOWN_ATTRIBUTE_NAMES = new Set(["firstName", "lastName", "studentNumber", "faculty", "year"]);

type CredentialAttribute = { name: string; value: string };

function findAttribute(attributes: CredentialAttribute[] | undefined, name: string) {
  return attributes?.find((attribute) => attribute.name === name)?.value;
}

function buildHolderName(attributes: CredentialAttribute[] | undefined) {
  const first = findAttribute(attributes, "firstName");
  const last = findAttribute(attributes, "lastName");
  return [first, last].filter(Boolean).join(" ").trim() || "Unknown holder";
}

export default function CredentialScreen() {
  const { session } = useWalletSession();
  const credentialsQuery = useQuery({
    queryKey: ["stored-credentials", session.walletId ?? "no-wallet"],
    queryFn: getStoredCredentials,
    refetchInterval: (query) => ((query.state.data ?? []).length === 0 ? 2000 : false),
  });

  const credentials = credentialsQuery.data ?? [];
  const credential = credentials[0];
  const attributes = credential?.credentialAttributes;
  const otherAttributes = attributes?.filter((attribute) => !KNOWN_ATTRIBUTE_NAMES.has(attribute.name)) ?? [];

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Credential</Text>
          <Text style={typography.title}>Student status</Text>
          <Text style={typography.body}>Present this credential when a service point needs proof of status.</Text>
        </View>

        {credentialsQuery.isLoading ? <Text style={typography.body}>Loading credential…</Text> : null}

        {credentialsQuery.isError ? (
          <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>
            Credential details could not be loaded.
          </Text>
        ) : null}

        {!credentialsQuery.isLoading && credentials.length === 0 ? (
          <View
            style={{
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              gap: spacing.sm,
              padding: spacing.lg,
            }}
          >
            <Text style={typography.sectionTitle}>No credentials stored yet</Text>
            <Text style={typography.body}>
              Open an activation link from your university to receive your student credential.
            </Text>
          </View>
        ) : null}

        {credential ? (
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              padding: spacing.lg,
              gap: spacing.lg,
            }}
          >
            <View style={{ alignItems: "flex-start", gap: spacing.sm }}>
              <StatusPill label="issued" tone="success" />
              <Text style={[typography.title, { color: colors.white }]}>{buildHolderName(attributes)}</Text>
              <Text style={{ color: colors.primarySoft, fontSize: 16 }}>{ISSUER_LABEL}</Text>
            </View>

            <View style={{ backgroundColor: colors.white, borderRadius: 8, padding: spacing.md, gap: spacing.sm }}>
              <InfoRow label="Student number" value={findAttribute(attributes, "studentNumber") ?? "-"} />
              <InfoRow label="Faculty" value={findAttribute(attributes, "faculty") ?? "-"} />
              <InfoRow label="Year" value={findAttribute(attributes, "year") ?? "-"} />
              <InfoRow label="Issuer" value={ISSUER_LABEL} />
              {otherAttributes.map((attribute) => (
                <InfoRow key={attribute.name} label={attribute.name} value={attribute.value} />
              ))}
            </View>
          </View>
        ) : null}

        <View
          style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: spacing.md, padding: spacing.lg }}
        >
          <Text style={typography.sectionTitle}>Storage records</Text>
          <InfoRow label="Wallet ID" value={session.walletId ?? "-"} />
          {credential ? <InfoRow label="Credential record" value={credential.id} /> : null}
        </View>
      </View>
    </AppScreen>
  );
}
