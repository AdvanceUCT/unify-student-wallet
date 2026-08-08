import { useCallback, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  FlatList,
  Text,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type ViewToken,
} from "react-native";

import { StudentCard, type CredentialLike } from "@/src/components/StudentCard";
import { colors } from "@/src/theme/colors";
import { spacing } from "@/src/theme/spacing";
import { typography } from "@/src/theme/typography";

const MAX_CARD_WIDTH = 430;
const CARD_PEEK = 28;

type CredentialCarouselProps = {
  accessibilityLabel?: string;
  credentials: CredentialLike[];
  onCredentialPress?: (credential: CredentialLike) => void;
};

export function CredentialCarousel({ accessibilityLabel = "Credentials", credentials, onCredentialPress }: CredentialCarouselProps) {
  const listRef = useRef<FlatList<CredentialLike>>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const hasMultiple = credentials.length > 1;
  const cardWidth = Math.min(
    Math.max(0, viewportWidth - (hasMultiple ? CARD_PEEK + spacing.md : 0)),
    MAX_CARD_WIDTH,
  );
  const itemWidth = cardWidth + (hasMultiple ? spacing.md : 0);

  const goToCredential = useCallback((index: number) => {
    if (!credentials.length || !itemWidth) return;
    const next = Math.max(0, Math.min(credentials.length - 1, index));
    listRef.current?.scrollToOffset({ animated: true, offset: itemWidth * next });
    activeIndexRef.current = next;
    setActiveIndex(next);
  }, [credentials.length, itemWidth]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0) setViewportWidth(width);
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 62 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<CredentialLike>[] }) => {
    const index = viewableItems.find((item) => item.isViewable)?.index;
    if (index === null || index === undefined || index === activeIndexRef.current) return;
    activeIndexRef.current = index;
    setActiveIndex(index);
    const credential = credentials[index];
    const issuer = credential?.connectionLabel ?? "credential";
    void AccessibilityInfo.announceForAccessibility(`Credential ${index + 1} of ${credentials.length}, ${issuer}`);
  }).current;

  const renderItem = useCallback(({ item }: ListRenderItemInfo<CredentialLike>) => (
    <View style={{ width: itemWidth, alignItems: hasMultiple ? "flex-start" : "center" }}>
      <StudentCard
        credential={item}
        onPress={onCredentialPress ? () => onCredentialPress(item) : undefined}
        width={cardWidth}
      />
    </View>
  ), [cardWidth, hasMultiple, itemWidth, onCredentialPress]);

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
    <View onLayout={onLayout} style={{ width: "100%", gap: spacing.sm }} testID="credential-carousel">
      {cardWidth > 0 ? (
        <FlatList
          ref={listRef}
          accessibilityActions={hasMultiple ? accessibilityActions : undefined}
          accessibilityLabel={`${accessibilityLabel}, credential ${activeIndex + 1} of ${credentials.length}`}
          accessibilityRole={hasMultiple ? "adjustable" : undefined}
          data={credentials}
          decelerationRate="fast"
          disableIntervalMomentum
          getItemLayout={getItemLayout}
          horizontal
          keyExtractor={(item) => item.id}
          onAccessibilityAction={onAccessibilityAction}
          onViewableItemsChanged={onViewableItemsChanged}
          removeClippedSubviews={false}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={hasMultiple ? itemWidth : undefined}
          style={{ width: viewportWidth }}
          testID="credential-carousel-list"
          viewabilityConfig={viewabilityConfig}
        />
      ) : null}
      {hasMultiple ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[typography.caption, { color: colors.inkSubtle, textAlign: "center" }]}
        >
          {activeIndex + 1} / {credentials.length}
        </Text>
      ) : null}
    </View>
  );
}
