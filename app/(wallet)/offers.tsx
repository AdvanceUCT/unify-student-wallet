import { useQuery } from "@tanstack/react-query";
import { Mail as MailIcon } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { Tag } from "@/src/components/Tag";
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

  // Pending offer IDs live in session state; load the full records when this page opens.
  const offersQuery = useQuery({
    queryKey: ["pending-offers", pendingOfferIds.join(",")],
    queryFn: async () => {
      const records = await Promise.all(pendingOfferIds.map((id) => getCredentialRecord(id)));
      // If Credo has not exposed the full record yet, keep a placeholder row visible.
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
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader
          eyebrow="Offers"
          title="Pending offers."
          meta={offers.length > 0 ? `${offers.length} waiting` : undefined}
        />

        {actionError ? (
          <Card>
            <Text style={[typography.bodyStrong, { color: colors.error }]}>{actionError}</Text>
          </Card>
        ) : null}

        {offers.length === 0 ? (
          <EmptyState
            icon={MailIcon}
            eyebrow="No pending offers"
            body="Credential offers from issuers will appear here. Open an activation link to receive one."
          />
        ) : (
          <View style={{ gap: spacing.md }}>
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
                <Card key={id} elevation="md">
                  <View style={{ gap: spacing.sm }}>
                    <Tag label={issuer} tone="primary" />
                    <Text style={typography.heading}>{headline}</Text>
                  </View>
                  <View style={{ marginTop: spacing.md }}>
                    {attributes?.length ? (
                      attributes.map((attribute, i) => (
                        <InfoRow
                          key={attribute.name}
                          label={humanize(attribute.name)}
                          value={attribute.value}
                          divider={i < attributes.length - 1}
                        />
                      ))
                    ) : (
                      <Text style={typography.body}>
                        The issuer hasn&apos;t included attribute details on this offer yet.
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
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
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </AppScreen>
  );
}
