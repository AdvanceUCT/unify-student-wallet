import { router, useLocalSearchParams } from "expo-router";
import {
  Activity,
  ChevronLeft,
  Home,
  IdCard,
  ScanLine,
  Settings,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  BackHandler,
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type ViewToken,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { ActivityLedger } from "@/src/components/ActivityLedger";
import { StudentCard, type CredentialLike } from "@/src/components/StudentCard";
import { TrustSeal } from "@/src/components/TrustSeal";
import { VerificationConsentPanel } from "@/src/components/VerificationConsentPanel";
import type { VerificationActivityRecord } from "@/src/features/verification/activityHistory";
import { useHolderAgent } from "@/src/features/wallet/HolderAgentProvider";
import { useWalletSession } from "@/src/features/wallet/WalletSessionProvider";
import type { FirstRunSetupStatus } from "@/src/features/wallet/sessionTypes";
import { colors } from "@/src/theme/colors";
import { motion } from "@/src/theme/motion";
import { radii } from "@/src/theme/radii";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

type Page = {
  key: "identity" | "scan" | "control";
  title: string;
  body: string;
};

const PAGES: Page[] = [
  {
    key: "identity",
    title: "Your identity, at a glance.",
    body: "Find your student ID, issuer and validity from Home or ID.",
  },
  {
    key: "scan",
    title: "Verify only what you approve.",
    body: "Scan a code, review the exact requested values, then choose whether to present them.",
  },
  {
    key: "control",
    title: "Stay in control.",
    body: "Review activity, manage security, create backups and revisit this guide in Settings.",
  },
];

const MAX_CONTENT_WIDTH = 620;

function PreviewNavigation({ active }: { active: ("home" | "id" | "scan" | "activity")[] }) {
  const items = [
    { key: "home" as const, label: "Home", Icon: Home },
    { key: "id" as const, label: "ID", Icon: IdCard },
    { key: "scan" as const, label: "Scan", Icon: ScanLine },
    { key: "activity" as const, label: "Activity", Icon: Activity },
  ];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height: 62,
        borderTopWidth: 1,
        borderColor: colors.rule,
        flexDirection: "row",
        backgroundColor: colors.surface,
      }}
    >
      {items.map(({ key, label, Icon }) => {
        const selected = active.includes(key);
        const emphasized = key === "scan";
        return (
          <View key={key} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3 }}>
            <View
              style={
                emphasized
                  ? {
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: selected ? colors.primaryDeep : colors.ink,
                    }
                  : undefined
              }
            >
              <Icon color={emphasized ? colors.white : selected ? colors.primary : colors.inkSubtle} size={18} strokeWidth={selected ? 2.2 : 1.7} />
            </View>
            {!emphasized ? <Text style={[typography.caption, { color: selected ? colors.primary : colors.inkSubtle, fontSize: 10 }]}>{label}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function PreviewFrame({ children, active, height }: { children: ReactNode; active: ("home" | "id" | "scan" | "activity")[]; height: number }) {
  return (
    <View
      style={{
        height,
        overflow: "hidden",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.rule,
        borderRadius: radii.lg,
      }}
    >
      <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
      <PreviewNavigation active={active} />
    </View>
  );
}

const IDENTITY_FIXTURE: CredentialLike = {
  id: "sample-student-identity",
  state: "active",
  credentialAttributes: [
    { name: "institution", value: "University of Cape Town" },
    { name: "firstName", value: "Alex" },
    { name: "lastName", value: "Student" },
    { name: "studentNumber", value: "STU-2048" },
    { name: "faculty", value: "Science" },
    { name: "programme", value: "BSc Computer Science" },
    { name: "year", value: "2026" },
    { name: "issuedAt", value: "2026-01-15" },
    { name: "expiresAt", value: "2026-12-31" },
  ],
};

const ACCESS_FIXTURE: CredentialLike = {
  id: "sample-campus-access",
  state: "active",
  credentialAttributes: [
    { name: "institution", value: "UCT Campus Services" },
    { name: "firstName", value: "Alex" },
    { name: "lastName", value: "Student" },
    { name: "studentNumber", value: "STU-2048" },
    { name: "faculty", value: "Campus Access" },
    { name: "programme", value: "Campus Access" },
    { name: "year", value: "2026" },
    { name: "issuedAt", value: "2026-01-15" },
    { name: "expiresAt", value: "2026-12-31" },
  ],
};

function IdentityScene({ height }: { height: number }) {
  const { width } = useWindowDimensions();
  const [sceneWidth, setSceneWidth] = useState(Math.min(Math.max(width - spacing.xl * 2 - 2, 240), MAX_CONTENT_WIDTH - 2));
  const cardWidth = Math.min(Math.max(sceneWidth - 46, 0), 360);

  return (
    <PreviewFrame active={["home", "id"]} height={height}>
      <View onLayout={(event) => setSceneWidth(event.nativeEvent.layout.width)} style={{ flex: 1, padding: spacing.md, gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.eyebrow, { fontSize: 9 }]}>UNIFY student wallet</Text>
            <Text style={[typography.heading, { fontSize: 18 }]}>Your identity</Text>
          </View>
          <View style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt }}>
            <Settings color={colors.inkMuted} size={16} />
          </View>
        </View>

        <View style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {cardWidth > 0 ? (
            <View style={{ flex: 1 }}>
              <View style={{ position: "absolute", left: 34, top: 16 }}><StudentCard credential={ACCESS_FIXTURE} width={cardWidth} /></View>
              <View style={{ position: "absolute", left: 0, top: 0 }}><StudentCard credential={IDENTITY_FIXTURE} width={cardWidth} /></View>
            </View>
          ) : null}
        </View>
      </View>
    </PreviewFrame>
  );
}

function QrFrame() {
  const corner = { position: "absolute" as const, width: 26, height: 26, borderColor: colors.cameraInk };
  return (
    <View style={{ flex: 1, backgroundColor: colors.camera, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 144, height: 144 }}>
        <View style={[corner, { left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3 }]} />
        <View style={[corner, { right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3 }]} />
        <View style={[corner, { left: 0, bottom: 0, borderLeftWidth: 3, borderBottomWidth: 3 }]} />
        <View style={[corner, { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3 }]} />
        <View style={{ position: "absolute", left: 14, right: 14, top: 70, height: 2, backgroundColor: colors.focus }} />
      </View>
      <Text style={[typography.caption, { color: colors.cameraInk, marginTop: spacing.md, fontSize: 10 }]}>Align a UNIFY QR code within the frame</Text>
    </View>
  );
}

function ScanScene({ active, height, reducedMotion }: { active: boolean; height: number; reducedMotion: boolean }) {
  const progress = useSharedValue(reducedMotion ? 1 : 0);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!active || animatedRef.current) return;
    animatedRef.current = true;
    progress.value = reducedMotion
      ? 1
      : withTiming(1, { duration: motion.standard, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
  }, [active, progress, reducedMotion]);

  const cameraStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value * 0.62, transform: [{ translateY: -8 * progress.value }] }));
  const sheetStyle = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateY: 18 * (1 - progress.value) }] }));

  return (
    <PreviewFrame active={["scan"]} height={height}>
      <View style={{ flex: 1, overflow: "hidden" }}>
        <Animated.View style={[{ flex: 1 }, cameraStyle]}><QrFrame /></Animated.View>
        <Animated.View style={[{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }, sheetStyle]}>
          <VerificationConsentPanel
            compact
            servicePointName="Main entrance"
            style={{ position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.sm }}
            values={[{ name: "Enrolment status", value: "Active" }, { name: "Student number", value: "STU-2048" }]}
            verifierName="Campus Library"
          />
        </Animated.View>
      </View>
    </PreviewFrame>
  );
}

function ControlScene({ height }: { height: number }) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const records: VerificationActivityRecord[] = [
    { id: "sample-library", walletId: "sample", proofExchangeId: "sample-1", verifierName: "Campus Library", servicePointName: "Main entrance", status: "Approved", disclosedValues: [{ name: "Enrolment status", value: "Active" }], occurredAt: now.toISOString() },
    { id: "sample-services", walletId: "sample", proofExchangeId: "sample-2", verifierName: "Student Services", servicePointName: "Help desk", status: "Declined", disclosedValues: [{ name: "Student number", value: "STU-2048" }], occurredAt: yesterday.toISOString() },
  ];

  return (
    <PreviewFrame active={["activity"]} height={height}>
      <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
        <View><Text style={[typography.eyebrow, { fontSize: 9 }]}>Audit trail</Text><Text style={[typography.heading, { fontSize: 18 }]}>Activity</Text></View>
        <ActivityLedger compact records={records} />
        <View style={{ marginTop: "auto", flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceAlt, padding: spacing.md }}>
          <Settings color={colors.primary} size={18} />
          <View style={{ flex: 1 }}><Text style={[typography.bodyStrong, { fontSize: 11 }]}>Wallet settings</Text><Text style={[typography.caption, { fontSize: 9 }]}>Security · Backup · Preferences</Text></View>
          <ChevronLeft color={colors.inkSubtle} size={16} style={{ transform: [{ rotate: "180deg" }] }} />
        </View>
      </View>
    </PreviewFrame>
  );
}

function SetupProgressBar({ complete, reducedMotion }: { complete: boolean; reducedMotion: boolean }) {
  const width = useSharedValue(0);
  const progress = useSharedValue(complete ? 1 : 0.34);

  useEffect(() => {
    cancelAnimation(progress);
    if (complete) {
      progress.value = reducedMotion
        ? 1
        : withTiming(1, { duration: motion.standard, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
      return;
    }
    if (reducedMotion) {
      progress.value = 0.56;
      progress.value = withRepeat(
        withTiming(0.72, { duration: 1200, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.Never }),
        -1,
        true,
      );
      return () => cancelAnimation(progress);
    }
    progress.value = withRepeat(
      withTiming(0.82, { duration: 860, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.System }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [complete, progress, reducedMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -(width.value * (1 - progress.value)) / 2 },
      { scaleX: progress.value },
    ],
  }));

  return (
    <View
      accessibilityLabel={complete ? "Wallet setup complete" : "Finishing secure wallet setup"}
      accessibilityRole="progressbar"
      accessibilityValue={{ text: complete ? "Complete" : "In progress" }}
      onLayout={(event) => {
        width.value = event.nativeEvent.layout.width;
      }}
      style={{ width: "100%", maxWidth: 360, height: 8, backgroundColor: colors.rule, borderRadius: radii.pill, overflow: "hidden" }}
    >
      <Animated.View style={[{ width: "100%", height: "100%", backgroundColor: colors.primary, borderRadius: radii.pill }, fillStyle]} />
    </View>
  );
}

function FinishingSetup({
  complete,
  error,
  onBackToPin,
  onRetry,
  reducedMotion,
  setupStatus,
}: {
  complete: boolean;
  error?: string;
  onBackToPin?: () => void;
  onRetry: () => void;
  reducedMotion: boolean;
  setupStatus: FirstRunSetupStatus;
}) {
  const workingCopy = setupStatus === "preparing"
    ? {
        eyebrow: "Protecting wallet access",
        title: "Securing your PIN",
        message: "Creating the cryptographic protection used to unlock this wallet.",
      }
    : {
        eyebrow: "Secure setup",
        title: "Creating encrypted wallet",
        message: "Starting credential services and preparing encrypted storage on this device.",
      };

  return (
    <AppScreen scrollable={false}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing["2xl"] }}>
        <TrustSeal
          busy={!error && !complete}
          key={error ? "error" : complete ? "complete" : "working"}
          haptic={complete}
          size={124}
          state={error ? "error" : complete ? "success" : "secure"}
        />
        <View style={{ alignItems: "center", gap: spacing.sm, maxWidth: 340 }}>
          <Text style={[typography.eyebrow, { color: error ? colors.error : colors.primary }]}>{error ? "Setup interrupted" : complete ? "Wallet secured" : workingCopy.eyebrow}</Text>
          <Text accessibilityRole="header" style={[typography.display, { textAlign: "center" }]}>{error ? "Setup needs attention" : complete ? "Your wallet is ready" : workingCopy.title}</Text>
          <Text accessibilityLiveRegion="polite" style={[typography.bodyLg, { textAlign: "center" }]}>{error ?? (complete ? "Encrypted storage and secure connections are ready." : workingCopy.message)}</Text>
        </View>
        {error ? (
          <View style={{ width: "100%", maxWidth: 360, gap: spacing.md }}>
            <AppButton label="Try again" size="lg" onPress={onRetry} />
            {onBackToPin ? <AppButton label="Back to PIN setup" variant="ghost" onPress={onBackToPin} /> : null}
          </View>
        ) : <SetupProgressBar complete={complete} reducedMotion={reducedMotion} />}
      </View>
    </AppScreen>
  );
}

export default function OnboardingScreen() {
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const replay = mode === "replay";
  const reducedMotion = useReducedMotion();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const {
    completeOnboarding,
    firstRunSetupError,
    firstRunSetupStatus,
    resetFirstRunSetup,
    retryFirstRunSetup,
    session,
  } = useWalletSession();
  const holderAgent = useHolderAgent();
  const listRef = useRef<FlatList<Page>>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(Math.min(windowWidth - spacing.xl * 2, MAX_CONTENT_WIDTH));
  const [pagerHeight, setPagerHeight] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [completionError, setCompletionError] = useState<string>();
  const [completionAttempt, setCompletionAttempt] = useState(0);
  const completionStartedRef = useRef(false);
  const previewHeight = Math.max(
    180,
    Math.min(338, pagerHeight > 0 ? pagerHeight - 88 - spacing.lg : windowHeight * 0.42),
  );

  const goToPage = useCallback((index: number) => {
    const next = Math.max(0, Math.min(PAGES.length - 1, index));
    listRef.current?.scrollToIndex({ animated: !reducedMotion, index: next });
    activeIndexRef.current = next;
    setActiveIndex(next);
  }, [reducedMotion]);

  const closeReplay = useCallback(() => router.replace("/(wallet)/settings"), []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (activeIndexRef.current > 0) {
        goToPage(activeIndexRef.current - 1);
        return true;
      }
      if (replay) closeReplay();
      return true;
    });
    return () => subscription.remove();
  }, [closeReplay, goToPage, replay]);

  useEffect(() => {
    void AccessibilityInfo.announceForAccessibility(`Page 1 of ${PAGES.length}, ${PAGES[0].title}`);
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<Page>[] }) => {
    const index = viewableItems.find((item) => item.isViewable)?.index;
    if (index === null || index === undefined || index === activeIndexRef.current) return;
    activeIndexRef.current = index;
    setActiveIndex(index);
    void AccessibilityInfo.announceForAccessibility(`Page ${index + 1} of ${PAGES.length}, ${PAGES[index].title}`);
  }).current;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.min(event.nativeEvent.layout.width, MAX_CONTENT_WIDTH);
    if (nextWidth > 0) setViewportWidth(nextWidth);
  }, []);

  useEffect(() => {
    listRef.current?.scrollToIndex({ animated: false, index: activeIndexRef.current });
  }, [viewportWidth]);

  const setupComplete = firstRunSetupStatus === "ready" || (Boolean(session.walletId) && holderAgent.status === "ready");
  const setupError = completionError ?? firstRunSetupError ?? (holderAgent.status === "error" ? holderAgent.error : undefined);

  useEffect(() => {
    if (!finishing || !setupComplete || setupError || completionStartedRef.current) return;
    completionStartedRef.current = true;
    const finish = async () => {
      try {
        await completeOnboarding();
        router.replace("/(auth)/resume");
      } catch (error) {
        completionStartedRef.current = false;
        setCompletionError(error instanceof Error ? error.message : "Wallet setup could not be saved.");
      }
    };
    const timer = setTimeout(() => void finish(), reducedMotion ? 0 : motion.result);
    return () => clearTimeout(timer);
  }, [completeOnboarding, completionAttempt, finishing, reducedMotion, setupComplete, setupError]);

  function finishFirstRun() {
    if (finishing) return;
    setFinishing(true);
  }

  async function retrySetup() {
    setCompletionError(undefined);
    completionStartedRef.current = false;
    if (firstRunSetupStatus === "error" || holderAgent.status === "error") {
      await retryFirstRunSetup();
      return;
    }
    setCompletionAttempt((value) => value + 1);
  }

  async function backToPin() {
    await resetFirstRunSetup();
    router.replace("/(auth)/set-pin");
  }

  function handlePrimary() {
    if (activeIndex < PAGES.length - 1) {
      goToPage(activeIndex + 1);
      return;
    }
    if (replay) closeReplay();
    else finishFirstRun();
  }

  const renderPage = useCallback(({ item, index }: ListRenderItemInfo<Page>) => (
    <View style={{ width: viewportWidth, height: pagerHeight || undefined, paddingHorizontal: 1 }} testID={`onboarding-page-${item.key}`}>
      <View accessible accessibilityLabel={`Page ${index + 1} of ${PAGES.length}. ${item.title} ${item.body}`} style={{ flex: 1, gap: spacing.lg }}>
        <View style={{ minHeight: 88, gap: spacing.xs }}>
          <Text style={typography.eyebrow}>Wallet introduction</Text>
          <Text accessibilityRole="header" style={[typography.title, { fontSize: windowHeight < 650 ? 24 : 27 }]}>{item.title}</Text>
          <Text style={typography.body}>{item.body}</Text>
        </View>
        {item.key === "identity" ? <IdentityScene height={previewHeight} /> : item.key === "scan" ? <ScanScene active={activeIndex === index} height={previewHeight} reducedMotion={reducedMotion} /> : <ControlScene height={previewHeight} />}
      </View>
    </View>
  ), [activeIndex, pagerHeight, previewHeight, reducedMotion, viewportWidth, windowHeight]);

  const getItemLayout = useCallback((_data: ArrayLike<Page> | null | undefined, index: number) => ({ index, length: viewportWidth, offset: viewportWidth * index }), [viewportWidth]);

  const accessibilityActions = useMemo(() => [{ name: "increment" as const, label: "Next page" }, { name: "decrement" as const, label: "Previous page" }], []);
  const handleAccessibilityAction = useCallback((event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "increment") goToPage(activeIndexRef.current + 1);
    if (event.nativeEvent.actionName === "decrement") goToPage(activeIndexRef.current - 1);
  }, [goToPage]);

  if (finishing) {
    return (
      <FinishingSetup
        complete={setupComplete && !setupError}
        error={setupError}
        onBackToPin={!session.walletId ? () => void backToPin() : undefined}
        onRetry={() => void retrySetup()}
        reducedMotion={reducedMotion}
        setupStatus={firstRunSetupStatus}
      />
    );
  }

  return (
    <AppScreen scrollable={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
      <View style={{ flex: 1, alignItems: "center" }} onLayout={handleLayout}>
        <View style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH, flexDirection: "row", justifyContent: "flex-end", minHeight: 40 }}>
          <Pressable accessibilityRole="button" onPress={replay ? closeReplay : finishFirstRun} hitSlop={8} style={({ pressed }) => ({ paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, opacity: pressed ? 0.6 : 1 })}>
            <Text style={[typography.label, { color: colors.primary }]}>{replay ? "Close" : "Skip"}</Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          accessibilityActions={accessibilityActions}
          accessibilityLabel={`Wallet introduction, page ${activeIndex + 1} of ${PAGES.length}`}
          accessibilityRole="adjustable"
          data={PAGES}
          decelerationRate="fast"
          extraData={activeIndex}
          getItemLayout={getItemLayout}
          horizontal
          keyExtractor={(item) => item.key}
          onAccessibilityAction={handleAccessibilityAction}
          onLayout={(event) => setPagerHeight(event.nativeEvent.layout.height)}
          onViewableItemsChanged={onViewableItemsChanged}
          pagingEnabled
          renderItem={renderPage}
          showsHorizontalScrollIndicator={false}
          style={{ width: viewportWidth, flex: 1, minHeight: 0 }}
          viewabilityConfig={viewabilityConfig}
        />

        <View style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH, marginTop: spacing.lg, gap: spacing.md }}>
          <View accessible accessibilityLabel={`Page ${activeIndex + 1} of ${PAGES.length}`} accessibilityRole="text" style={{ flexDirection: "row", justifyContent: "center", gap: spacing.sm, height: 10 }}>
            {PAGES.map((page, index) => <View key={page.key} importantForAccessibility="no" style={{ width: index === activeIndex ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: index === activeIndex ? colors.primary : colors.rule }} />)}
          </View>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}><AppButton disabled={activeIndex === 0} label="Back" variant="outline" onPress={() => goToPage(activeIndex - 1)} /></View>
            <View style={{ flex: 1 }}><AppButton label={activeIndex === PAGES.length - 1 ? replay ? "Done" : "Enter wallet" : "Next"} onPress={handlePrimary} /></View>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}
