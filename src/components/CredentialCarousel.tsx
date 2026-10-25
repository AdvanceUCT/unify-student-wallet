/**
 * @fileoverview Renders horizontally paged credential cards with accessible selection.
 * @module components/CredentialCarousel
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type ViewToken,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { StudentCard, type CredentialLike } from "@/src/components/StudentCard";
import { colors } from "@/src/theme/colors";
import {
  standardContentMaxWidth,
  studentCardAspectRatio,
  studentCardMaxWidth,
} from "@/src/theme/layout";
import { motion } from "@/src/theme/motion";
import { spacing } from "@/src/theme/spacing";

const CARD_PEEK = 40;
const ITEM_GAP = spacing.md;
const PAGE_DOTS_HEIGHT = 8;

function estimatedViewportWidth(windowWidth: number) {
  return Math.min(
    Math.max(0, windowWidth - spacing.xl * 2),
    standardContentMaxWidth,
  );
}

type CredentialCarouselProps = {
  accessibilityLabel?: string;
  credentials: CredentialLike[];
  onCredentialPress?: (credential: CredentialLike) => void;
};

type AnimatedCredentialItemProps = {
  cardWidth: number;
  credential: CredentialLike;
  index: number;
  itemWidth: number;
  onPress?: () => void;
  scrollX: SharedValue<number>;
};

function AnimatedCredentialItem({ cardWidth, credential, index, itemWidth, onPress, scrollX }: AnimatedCredentialItemProps) {
  const reducedMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    const input = [(index - 1) * itemWidth, index * itemWidth, (index + 1) * itemWidth];
    return {
      opacity: interpolate(scrollX.value, input, [0.7, 1, 0.7], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(scrollX.value, input, [0.94, 1, 0.94], Extrapolation.CLAMP) },
        { translateY: interpolate(scrollX.value, input, [7, 0, 7], Extrapolation.CLAMP) },
      ],
    };
  }, [index, itemWidth, reducedMotion]);

  return (
    <Animated.View style={[styles.credentialItem, { width: itemWidth }, animatedStyle]}>
      <StudentCard credential={credential} onPress={onPress} width={cardWidth} />
    </Animated.View>
  );
}

function PageDot({ active, index }: { active: boolean; index: number }) {
  const width = useSharedValue(active ? 18 : 6);
  const opacity = useSharedValue(active ? 1 : 0.34);

  useEffect(() => {
    width.value = withTiming(active ? 18 : 6, { duration: motion.quick, reduceMotion: ReduceMotion.System });
    opacity.value = withTiming(active ? 1 : 0.34, { duration: motion.quick, reduceMotion: ReduceMotion.System });
  }, [active, opacity, width]);

  const animatedStyle = useAnimatedStyle(() => ({ width: width.value, opacity: opacity.value }));
  return <Animated.View style={[styles.pageDot, { backgroundColor: colors.primary }, animatedStyle]} testID={`credential-page-dot-${index}`} />;
}

export function CredentialCarousel({ accessibilityLabel = "Credentials", credentials, onCredentialPress }: CredentialCarouselProps) {
  const { width: windowWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<CredentialLike>>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() => estimatedViewportWidth(windowWidth));
  const scrollX = useSharedValue(0);
  const hasMultiple = credentials.length > 1;
  const cardWidth = Math.min(
    Math.max(0, viewportWidth - (hasMultiple ? CARD_PEEK + ITEM_GAP : 0)),
    studentCardMaxWidth,
  );
  const itemWidth = cardWidth + (hasMultiple ? ITEM_GAP : 0);
  const cardHeight = cardWidth / studentCardAspectRatio;
  const fullCardHeight = Math.min(viewportWidth, studentCardMaxWidth) / studentCardAspectRatio;
  const indicatorSlotHeight = hasMultiple ? spacing.md + PAGE_DOTS_HEIGHT : 0;
  const carouselHeight = Math.max(fullCardHeight, cardHeight + indicatorSlotHeight);

  useEffect(() => {
    setViewportWidth(estimatedViewportWidth(windowWidth));
  }, [windowWidth]);

  useEffect(() => {
    if (activeIndexRef.current < credentials.length) return;
    activeIndexRef.current = 0;
    setActiveIndex(0);
    scrollX.value = 0;
  }, [credentials.length, scrollX]);

  const commitActiveIndex = useCallback((index: number, announce = false) => {
    const next = Math.max(0, Math.min(credentials.length - 1, index));
    if (next === activeIndexRef.current) return;
    activeIndexRef.current = next;
    setActiveIndex(next);
    if (announce) {
      const issuer = credentials[next]?.connectionLabel ?? "credential";
      void AccessibilityInfo.announceForAccessibility(`Credential ${next + 1} of ${credentials.length}, ${issuer}`);
    }
  }, [credentials]);

  const goToCredential = useCallback((index: number) => {
    if (!credentials.length || !itemWidth) return;
    const next = Math.max(0, Math.min(credentials.length - 1, index));
    listRef.current?.scrollToOffset({ animated: true, offset: itemWidth * next });
    scrollX.value = itemWidth * next;
    commitActiveIndex(next, true);
  }, [commitActiveIndex, credentials.length, itemWidth, scrollX]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0) setViewportWidth(width);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 62 }).current;
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<CredentialLike>[] }) => {
    const index = viewableItems.find((item) => item.isViewable)?.index;
    if (index !== null && index !== undefined) commitActiveIndex(index, true);
  }, [commitActiveIndex]);

  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<CredentialLike>) => (
    <AnimatedCredentialItem
      cardWidth={cardWidth}
      credential={item}
      index={index}
      itemWidth={itemWidth}
      onPress={onCredentialPress ? () => onCredentialPress(item) : undefined}
      scrollX={scrollX}
    />
  ), [cardWidth, itemWidth, onCredentialPress, scrollX]);

  const getItemLayout = useCallback((_data: ArrayLike<CredentialLike> | null | undefined, index: number) => ({
    index,
    length: itemWidth,
    offset: itemWidth * index,
  }), [itemWidth]);

  const accessibilityActions = useMemo(() => [
    { name: "increment" as const, label: "Next credential" },
    { name: "decrement" as const, label: "Previous credential" },
  ], []);

  const onAccessibilityAction = useCallback((event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "increment") goToCredential(activeIndexRef.current + 1);
    if (event.nativeEvent.actionName === "decrement") goToCredential(activeIndexRef.current - 1);
  }, [goToCredential]);

  if (!credentials.length) return null;

  return (
    <View
      onLayout={onLayout}
      style={[styles.container, { height: carouselHeight }]}
      testID="credential-carousel"
    >
      {cardWidth > 0 ? (
        <Animated.FlatList
          ref={listRef}
          accessibilityActions={hasMultiple ? accessibilityActions : undefined}
          accessibilityLabel={`${accessibilityLabel}, credential ${activeIndex + 1} of ${credentials.length}`}
          accessibilityRole={hasMultiple ? "adjustable" : undefined}
          data={credentials}
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={!hasMultiple ? styles.singleContent : undefined}
          getItemLayout={getItemLayout}
          horizontal
          keyExtractor={(item) => item.id}
          onAccessibilityAction={onAccessibilityAction}
          onScroll={scrollHandler}
          onViewableItemsChanged={onViewableItemsChanged}
          removeClippedSubviews={false}
          renderItem={renderItem}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={hasMultiple ? itemWidth : undefined}
          style={{ flexGrow: 0, height: cardHeight, width: viewportWidth }}
          testID="credential-carousel-list"
          viewabilityConfig={viewabilityConfig}
        />
      ) : null}
      {hasMultiple ? (
        <View
          accessibilityLabel={`Credential ${activeIndex + 1} of ${credentials.length}`}
          accessibilityLiveRegion="polite"
          style={styles.pageDots}
          testID="credential-page-indicator"
        >
          {credentials.map((credential, index) => (
            <PageDot active={index === activeIndex} index={index} key={credential.id} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: spacing.md,
  },
  credentialItem: {
    alignItems: "flex-start",
  },
  singleContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  pageDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    height: 8,
    justifyContent: "center",
  },
  pageDot: {
    borderRadius: 4,
    height: 6,
  },
});
