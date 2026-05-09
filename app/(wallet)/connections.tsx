import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import {
  getEstablishedConnections,
  type EstablishedConnection,
} from "@/src/features/wallet/connectionHandshake";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function ConnectionsScreen() {
  const { session } = useWalletSession();
  const [connections, setConnections] = useState<EstablishedConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session.lockStatus !== "unlocked") {
      setIsLoading(false);
      return;
    }

    void getEstablishedConnections().then((records) => {
      setConnections(records);
      setIsLoading(false);
    });
  }, [session.lockStatus]);

  return (
    <AppScreen>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Network</Text>
          <Text style={typography.title}>Verified Connections</Text>
          <Text style={typography.body}>
            Secure DIDComm channels established with your university agents.
          </Text>
        </View>

        {isLoading ? (
          <Text style={typography.body}>Loading connections...</Text>
        ) : session.lockStatus === "locked" ? (
          <Text style={typography.body}>Unlock your wallet to view verified connections.</Text>
        ) : connections.length === 0 ? (
          <View
            style={{
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              gap: spacing.sm,
              padding: spacing.lg,
            }}
          >
            <Text style={typography.sectionTitle}>No connections yet</Text>
            <Text style={typography.body}>
              Scan a university agent QR code from the Scan tab to establish a secure DIDComm channel.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {connections.map((conn) => (
              <View
                key={conn.connectionId}
                style={{
                  borderColor: colors.border,
                  borderRadius: 8,
                  borderWidth: 1,
                  gap: spacing.md,
                  padding: spacing.lg,
                }}
              >
                <View
                  style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}
                >
                  <Text style={[typography.sectionTitle, { flex: 1 }]} numberOfLines={1}>
                    {conn.label}
                  </Text>
                  <View
                    style={{
                      backgroundColor: colors.successSoft,
                      borderRadius: 4,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                    }}
                  >
                    <Text style={{ color: colors.success, fontSize: 12, fontWeight: "700" }}>
                      Connected
                    </Text>
                  </View>
                </View>

                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  Established {new Date(conn.establishedAt).toLocaleDateString()}
                </Text>

                <Text
                  numberOfLines={1}
                  style={{ color: colors.muted, fontSize: 11, fontFamily: "monospace" }}
                >
                  {conn.connectionId}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </AppScreen>
  );
}
