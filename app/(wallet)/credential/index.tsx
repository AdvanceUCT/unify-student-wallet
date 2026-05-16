import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { EmptyState } from "@/src/components/EmptyState";
import { ListItem } from "@/src/components/ListItem";
import { Rule } from "@/src/components/Rule";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { getStoredCredentials } from "@/src/features/wallet/holderAgent";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
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
      <ScreenHeader eyebrow="Wallet · Credentials" title="Your credentials." />

      {credentialsQuery.isLoading ? (
        <Text style={typography.body}>Loading credentials…</Text>
      ) : credentialsQuery.isError ? (
        <Text style={[typography.eyebrow, { color: colors.error }]}>
          Credentials could not be loaded.
        </Text>
      ) : credentials.length === 0 ? (
        <EmptyState
          eyebrow="No credentials yet"
          heading="Your wallet is empty."
          body="Open an activation link from your university to receive your first credential."
          action={<AppButton label="Open scanner" onPress={() => router.push("/(wallet)/scan")} />}
        />
      ) : (
        <View>
          <Rule />
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
            const subtitle = [
              [firstName, lastName].filter(Boolean).join(" ").trim() || "Holder pending",
              programme,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <View key={credential.id}>
                <ListItem
                  eyebrow={issuer.toUpperCase()}
                  title={programme ?? "Student credential"}
                  subtitle={subtitle}
                  meta={credential.state ?? "—"}
                  showChevron
                  onPress={() => router.push(`/(wallet)/credential/${credential.id}`)}
                />
                <Rule variant="hairline" />
              </View>
            );
          })}
        </View>
      )}
    </AppScreen>
  );
}
