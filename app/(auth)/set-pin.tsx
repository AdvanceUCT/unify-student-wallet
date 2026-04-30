import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

export default function SetPinScreen() {
  const { session, setPin } = useWalletSession();
  const [pin, setPinValue] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isActivationPending = session.activationStatus === "activationPending";

  async function handleSetPin() {
    const result = await setPin(pin, confirmation);
    setError(result.ok ? null : result.error);
  }

  return (
    <AppScreen>
      <View style={{ flex: 1, justifyContent: "space-between", gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.eyebrow}>Wallet security</Text>
          <Text style={typography.title}>Set your wallet PIN</Text>
          <Text style={typography.body}>
            {isActivationPending
              ? "Set a 4 to 6 digit PIN before the credential is accepted into local wallet storage."
              : "Use a 4 to 6 digit PIN to protect this demo wallet."}
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <TextInput
            accessibilityLabel="PIN"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setPinValue}
            placeholder="PIN"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              color: colors.text,
              fontSize: 16,
              padding: spacing.md,
            }}
            value={pin}
          />
          <TextInput
            accessibilityLabel="Confirm PIN"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setConfirmation}
            placeholder="Confirm PIN"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              color: colors.text,
              fontSize: 16,
              padding: spacing.md,
            }}
            value={confirmation}
          />
          {error ? <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700" }}>{error}</Text> : null}
          <AppButton label="Save PIN" onPress={handleSetPin} />
        </View>
      </View>
    </AppScreen>
  );
}
