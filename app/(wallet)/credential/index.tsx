import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { IdCard as IdCardIcon, ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Tag } from "@/src/components/Tag";
import { getStoredCredentials } from "@/src/features/wallet/holderAgent";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type CredentialAttribute = { name: string; value: string };

function findAttribute(attributes: CredentialAttribute[] | undefined, ...names: string[]) {
  if (!attributes) return undefined;
  for (const name of names) {
    const match = attributes.find((a) => a.name === name)?.value;
    if (match) return match;
  }
  return undefined;
}

export default function CredentialIndexScreen() {
  const { session } = useWalletSession();

  const credentialsQuery = useQuery({
    queryKey: ["stored-credentials", session.walletId ?? "no-wallet"],
    queryFn: getStoredCredentials,
    refetchInterval: (query) => ((query.state.data ?? []).length === 0 ? 2000 : false),
  });

  const credentials = credentialsQuery.data ?? [];

  return (
    <AppScreen>
      <ScreenHeader eyebrow="Wallet" title="Credentials." />

      {credentialsQuery.isLoading ? (
        <Card>
          <Text style={typography.body}>Loading credentials…</Text>
        </Card>
      ) : credentialsQuery.isError ? (
        <Card>
          <Text style={[typography.bodyStrong, { color: colors.error }]}>
            Credentials could not be loaded.
          </Text>
        </Card>
      ) : credentials.length === 0 ? (
        <EmptyState
          icon={IdCardIcon}
          eyebrow="No credentials yet"
          heading="Your wallet is empty."
          body="Open an activation link from your university to receive your first credential."
          action={<AppButton label="Open scanner" onPress={() => router.push("/(wallet)/scan")} />}
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          {credentials.map((credential) => {
            const attributes = credential.credentialAttributes;
            const issuer =
              findAttribute(attributes, "issuerName", "issuer", "institution", "university") ??
              "Issuer";
            const firstName = findAttribute(attributes, "firstName", "first_name", "givenName");
            const lastName = findAttribute(attributes, "lastName", "last_name", "familyName", "surname");
            const programme = findAttribute(
              attributes,
              "programme",
              "program",
              "faculty",
              "school",
              "department",
            );
            const holder = [firstName, lastName].filter(Boolean).join(" ").trim() || "Holder pending";

            return (
              <Pressable
                key={credential.id}
                accessibilityRole="button"
                onPress={() => router.push(`/(wallet)/credential/${credential.id}`)}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Card>
                  <View style={{ gap: spacing.sm }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text style={typography.eyebrow}>{issuer}</Text>
                      {credential.state ? <Tag label={credential.state} tone="primary" /> : null}
                    </View>
                    <Text style={typography.heading}>{programme ?? "Student credential"}</Text>
                    <Text style={typography.body}>{holder}</Text>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "flex-end",
                        marginTop: spacing.sm,
                      }}
                    >
                      <ChevronRight color={colors.inkSubtle} size={20} strokeWidth={1.5} />
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </AppScreen>
  );
}
