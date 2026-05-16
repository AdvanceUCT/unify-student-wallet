import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { EmptyState } from "@/src/components/EmptyState";
import { InfoRow } from "@/src/components/InfoRow";
import { Rule } from "@/src/components/Rule";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { getCredentialRecord } from "@/src/features/wallet/holderAgent";
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

function humanize(name: string) {
  return name
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OffersScreen() {
  const { acceptOffer, declineOffer, pendingOfferIds } = useWalletSession();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const offersQuery = useQuery({
    queryKey: ["pending-offers", pendingOfferIds.join(",")],
    queryFn: async () => {
      const records = await Promise.all(pendingOfferIds.map((id) => getCredentialRecord(id)));
      return records.map((record, index) => record ?? { id: pendingOfferIds[index] });
    },
  });

  async function handleAccept(id: string) {
    setActionError(null);
    setPendingId(id);
    const result = await acceptOffer(id);
    setPendingId(null);

    if (!result.ok) {
      setActionError(result.error);
    }
  }

  async function handleDecline(id: string) {
    setActionError(null);
    setPendingId(id);
    const result = await declineOffer(id);
    setPendingId(null);

    if (!result.ok) {
      setActionError(result.error);
    }
  }

  const offers = offersQuery.data ?? [];

  return (
    <AppScreen>
      <View style={{ gap: spacing["2xl"] }}>
        <ScreenHeader
          eyebrow="Offers"
          title="Pending offers."
          meta={offers.length > 0 ? `${offers.length} waiting` : undefined}
        />

        {actionError ? (
          <Text style={[typography.eyebrow, { color: colors.error }]}>{actionError}</Text>
        ) : null}

        {offers.length === 0 ? (
          <EmptyState
            eyebrow="No pending offers"
            body="Credential offers from issuers will appear here. Open an activation link to receive one."
          />
        ) : (
          <View style={{ gap: spacing["2xl"] }}>
            {offers.map((offer) => {
              const id = offer?.id;
              if (!id) {
                return null;
              }
              const isPending = pendingId === id;
              const attributes = (offer as { credentialAttributes?: CredentialAttribute[] })
                .credentialAttributes;
              const issuer =
                findAttribute(attributes, "issuerName", "issuer", "institution", "university") ??
                (offer as { connectionLabel?: string }).connectionLabel ??
                "Issuer";
              const headline =
                findAttribute(attributes, "programme", "program", "credentialName", "type") ??
                "Credential offer";

              return (
                <View key={id} style={{ gap: spacing.md }}>
                  <Rule />
                  <View style={{ gap: spacing.sm }}>
                    <Text style={typography.eyebrow}>{`New offer · ${issuer.toUpperCase()}`}</Text>
                    <Text style={typography.heading}>{headline}</Text>
                  </View>
                  <View style={{ marginTop: spacing.sm }}>
                    {attributes?.length ? (
                      attributes.map((attribute) => (
                        <InfoRow
                          key={attribute.name}
                          label={humanize(attribute.name)}
                          value={attribute.value}
                        />
                      ))
                    ) : (
                      <Text style={typography.body}>
                        The issuer hasn't included attribute details on this offer yet.
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <AppButton
                        disabled={isPending}
                        label="Accept"
                        onPress={() => void handleAccept(id)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppButton
                        disabled={isPending}
                        label="Decline"
                        onPress={() => void handleDecline(id)}
                        variant="outline"
                      />
                    </View>
                  </View>
                </View>
              );
            })}
            <Rule />
          </View>
        )}
      </View>
    </AppScreen>
  );
}
