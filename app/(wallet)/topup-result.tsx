/**
 * @fileoverview Reconciles a hosted top-up after browser return or app resume.
 * @module app/(wallet)/topup-result
 */

import { router, useLocalSearchParams } from "expo-router";
import { RefreshCcw } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { Card } from "@/src/components/Card";
import { InfoRow } from "@/src/components/InfoRow";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { formatZarMinor } from "@/src/features/payment/money";
import { isPaymentOnline, usePaymentNetworkStatus } from "@/src/features/payment/network";
import { getTopUp, reconcileTopUp, type TopUpStatus } from "@/src/features/payment/paymentApi";
import { paymentFailure } from "@/src/features/payment/paymentErrors";
import {
  clearPendingTopUp,
  loadPendingTopUp,
  savePendingTopUp,
  type PendingTopUp,
} from "@/src/features/payment/topUpSession";
import { useThemePalette } from "@/src/features/theme/ThemePreferenceProvider";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const POLL_INTERVAL_MS = 2_500;
const MAX_POLL_MS = 30_000;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function statusCopy(status: TopUpStatus["status"] | undefined) {
  if (status === "SUCCEEDED") {
    return {
      tone: "success" as const,
      title: "Top-up confirmed",
      message: "Your wallet was credited after server confirmation.",
    };
  }
  if (status === "FAILED") {
    return {
      tone: "error" as const,
      title: "Top-up failed",
      message: "No wallet credit was posted. You can start a new top-up with a new reference.",
    };
  }
  if (status === "UNKNOWN") {
    return {
      tone: "warning" as const,
      title: "Top-up not confirmed",
      message: "Do not pay again yet. Refresh when connected so the server can reconcile this checkout.",
    };
  }
  return {
    tone: "warning" as const,
    title: "Checking top-up",
    message: "Do not pay again while this checkout is pending. UNIFY is waiting for server confirmation.",
  };
}

export default function TopUpResultScreen() {
  const colors = useThemePalette();
  const { isOffline } = usePaymentNetworkStatus();
  const params = useLocalSearchParams<{ topUpId?: string | string[]; returned?: string | string[] }>();
  const routeTopUpId = firstParam(params.topUpId);
  const returnedFromBrowser = firstParam(params.returned) === "1";
  const [pending, setPending] = useState<PendingTopUp | null>(null);
  const [status, setStatus] = useState<TopUpStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const startedAtRef = useRef<number>(Date.now());
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const activeTopUpId = routeTopUpId || pending?.topUpId || "";
  const copy = statusCopy(status?.status ?? pending?.status);
  const toneColor = copy.tone === "success" ? colors.success : copy.tone === "error" ? colors.error : colors.warning;

  const terminal = status?.status === "SUCCEEDED" || status?.status === "FAILED";
  const amountMinor = status?.amountMinor ?? pending?.amountMinor;
  const reference = status?.reference ?? pending?.reference;

  const refreshStatus = useCallback(async (mode: "reconcile" | "poll") => {
    if (!activeTopUpId || inFlightRef.current) return;
    if (!(await isPaymentOnline())) {
      setChecking(false);
      setError("Reconnect to refresh this top-up. The pending reference is still saved.");
      return;
    }

    inFlightRef.current = true;
    setChecking(true);
    setError(null);
    try {
      const nextStatus = mode === "reconcile"
        ? await reconcileTopUp(activeTopUpId)
        : await getTopUp(activeTopUpId);
      if (!mountedRef.current) return;
      setStatus(nextStatus);

      if (nextStatus.status === "SUCCEEDED" || nextStatus.status === "FAILED") {
        await clearPendingTopUp();
        setPending(null);
        return;
      }

      if (pending && nextStatus.status === "UNKNOWN") {
        const nextPending = { ...pending, status: "UNKNOWN" as const };
        await savePendingTopUp(nextPending);
        setPending(nextPending);
      }
    } catch (caught) {
      const failure = paymentFailure(caught);
      setError(failure.message);
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setChecking(false);
    }
  }, [activeTopUpId, pending]);

  useEffect(() => {
    mountedRef.current = true;
    void loadPendingTopUp().then((nextPending) => {
      if (!mountedRef.current) return;
      setPending(nextPending);
      if (!routeTopUpId && !nextPending) setChecking(false);
    });
    return () => {
      mountedRef.current = false;
    };
  }, [routeTopUpId]);

  useEffect(() => {
    if (!activeTopUpId) return;
    void refreshStatus(returnedFromBrowser ? "reconcile" : "poll");
  }, [activeTopUpId, refreshStatus, returnedFromBrowser]);

  useEffect(() => {
    if (!activeTopUpId || terminal || isOffline) return;
    if (Date.now() - startedAtRef.current >= MAX_POLL_MS) {
      setChecking(false);
      return;
    }

    const timeout = setTimeout(() => void refreshStatus("poll"), POLL_INTERVAL_MS);
    return () => clearTimeout(timeout);
  }, [activeTopUpId, isOffline, refreshStatus, status, terminal]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && activeTopUpId && !terminal) {
        void refreshStatus("reconcile");
      }
    });
    return () => subscription.remove();
  }, [activeTopUpId, refreshStatus, terminal]);

  const primaryLabel = useMemo(() => {
    if (status?.status === "FAILED") return "Start a new top-up";
    if (status?.status === "SUCCEEDED") return "Done";
    if (checking) return "Checking...";
    return "Refresh status";
  }, [checking, status?.status]);

  function handlePrimary() {
    if (status?.status === "FAILED") {
      router.replace("/(wallet)/topup-amount");
      return;
    }
    if (status?.status === "SUCCEEDED") {
      router.replace("/(wallet)/payments");
      return;
    }
    void refreshStatus("reconcile");
  }

  return (
    <AppScreen
      footer={
        <View style={{ gap: spacing.sm }}>
          <AppButton
            disabled={checking || !activeTopUpId || isOffline}
            icon={status?.status === "PENDING" || status?.status === "UNKNOWN" ? RefreshCcw : undefined}
            label={primaryLabel}
            onPress={handlePrimary}
            size="lg"
          />
          <AppButton label="Back to payments" onPress={() => router.replace("/(wallet)/payments")} variant="secondary" />
        </View>
      }
    >
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader eyebrow="Wallet top-up" title={copy.title} meta={copy.message} />

        {isOffline ? (
          <Card elevation="sm">
            <Text accessibilityLiveRegion="assertive" style={[typography.bodyStrong, { color: colors.warning }]}>
              You are offline. The pending top-up is saved; reconnect before refreshing.
            </Text>
          </Card>
        ) : null}

        {activeTopUpId ? (
          <Card heading="Top-up status" elevation="md">
            <InfoRow divider label="Status" tone={copy.tone} value={status?.status ?? pending?.status ?? "PENDING"} />
            {amountMinor !== undefined ? <InfoRow divider label="Amount" value={formatZarMinor(amountMinor)} /> : null}
            {reference ? <InfoRow divider label="Reference" value={reference} /> : null}
            {status?.resultingBalanceMinor !== undefined ? (
              <InfoRow divider label="Balance" value={formatZarMinor(status.resultingBalanceMinor)} />
            ) : null}
            {status?.transactionId ? <InfoRow label="Transaction" value={status.transactionId} /> : null}
          </Card>
        ) : (
          <Card elevation="sm">
            <Text accessibilityLiveRegion="assertive" style={[typography.bodyStrong, { color: colors.error }]}>
              No pending top-up was found on this device.
            </Text>
          </Card>
        )}

        {error ? (
          <Text accessibilityLiveRegion="assertive" style={[typography.bodyStrong, { color: toneColor }]}>
            {error}
          </Text>
        ) : null}
      </View>
    </AppScreen>
  );
}
