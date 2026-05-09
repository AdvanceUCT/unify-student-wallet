import { ActivityIndicator, Modal, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import type { HandshakePhase } from "@/src/features/wallet/connectionHandshake";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type Props = {
  error: string | null;
  issuerLabel: string | null;
  onDismiss: () => void;
  onRetry?: () => void;
  phase: HandshakePhase;
};

const PHASE_LABEL: Record<HandshakePhase, string> = {
  abandoned: "The university agent refused the request.",
  completed: "Your wallet is now connected to the university agent.",
  failed: "Something went wrong establishing the connection.",
  idle: "",
  invited: "Processing invitation...",
  requesting: "Sending connection request...",
  responded: "Waiting for university confirmation...",
};

const IN_PROGRESS_PHASES = new Set<HandshakePhase>(["invited", "requesting", "responded"]);

export function ConnectionHandshakeOverlay({ error, issuerLabel, onDismiss, onRetry, phase }: Props) {
  const isVisible = phase !== "idle";
  const isInProgress = IN_PROGRESS_PHASES.has(phase);
  const isCompleted = phase === "completed";
  const isFailed = phase === "failed" || phase === "abandoned";

  return (
    <Modal animationType="fade" statusBarTranslucent transparent visible={isVisible}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.55)",
          flex: 1,
          justifyContent: "center",
          padding: spacing.lg,
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.surface,
            borderRadius: 12,
            gap: spacing.lg,
            padding: spacing.lg,
            width: "100%",
          }}
        >
          {isInProgress && <ActivityIndicator color={colors.primary} size="large" />}

          {isCompleted && (
            <View
              style={{
                alignItems: "center",
                backgroundColor: colors.successSoft,
                borderRadius: 28,
                height: 56,
                justifyContent: "center",
                width: 56,
              }}
            >
              <Text style={{ color: colors.success, fontSize: 26, fontWeight: "800" }}>✓</Text>
            </View>
          )}

          {isFailed && (
            <View
              style={{
                alignItems: "center",
                backgroundColor: colors.warningSoft,
                borderRadius: 28,
                height: 56,
                justifyContent: "center",
                width: 56,
              }}
            >
              <Text style={{ color: colors.warning, fontSize: 26, fontWeight: "800" }}>!</Text>
            </View>
          )}

          <View style={{ alignItems: "center", gap: spacing.sm, width: "100%" }}>
            <Text style={[typography.sectionTitle, { textAlign: "center" }]}>
              {isInProgress
                ? "Establishing Secure Connection"
                : isCompleted
                  ? "Connection Established"
                  : "Connection Failed"}
            </Text>

            {issuerLabel ? (
              <Text style={[typography.body, { textAlign: "center" }]}>with {issuerLabel}</Text>
            ) : null}

            <Text style={[typography.body, { textAlign: "center" }]}>{PHASE_LABEL[phase]}</Text>

            {error ? (
              <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "700", textAlign: "center" }}>
                {error}
              </Text>
            ) : null}
          </View>

          {(isCompleted || isFailed) && (
            <View style={{ gap: spacing.sm, width: "100%" }}>
              {isFailed && onRetry ? <AppButton label="Try again" onPress={onRetry} /> : null}
              <AppButton
                label={isCompleted ? "Done" : "Dismiss"}
                variant={isCompleted ? "primary" : "secondary"}
                onPress={onDismiss}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
