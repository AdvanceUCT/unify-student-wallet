import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { InfoRow } from "@/src/components/InfoRow";
import { getCredentialRecord } from "@/src/features/wallet/holderAgent";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

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
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Offers</Text>
          <Text style={typography.title}>Pending credential offers</Text>
          <Text style={typography.body}>Review each offer before storing it in your wallet.</Text>
        </View>

        {actionError ? (
          <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>{actionError}</Text>
        ) : null}

        {offers.length === 0 ? (
          <View style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, padding: spacing.lg }}>
            <Text style={typography.body}>No pending offers.</Text>
          </View>
        ) : (
          offers.map((offer) => {
            const id = offer?.id;
            if (!id) {
              return null;
            }
            const isPending = pendingId === id;
            const attributes = (offer as { credentialAttributes?: { name: string; value: string }[] })
              .credentialAttributes;

            return (
              <View
                key={id}
                style={{
                  borderColor: colors.border,
                  borderRadius: 8,
                  borderWidth: 1,
                  gap: spacing.md,
                  padding: spacing.lg,
                }}
              >
                <Text style={typography.sectionTitle}>Credential offer</Text>
                <InfoRow label="Record ID" value={id} />
                {attributes?.map((attribute) => (
                  <InfoRow key={attribute.name} label={attribute.name} value={attribute.value} />
                ))}
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <AppButton disabled={isPending} label="Accept" onPress={() => void handleAccept(id)} />
                  <AppButton
                    disabled={isPending}
                    label="Decline"
                    onPress={() => void handleDecline(id)}
                    variant="secondary"
                  />
                </View>
              </View>
            );
          })
        )}
      </View>
    </AppScreen>
  );
}
