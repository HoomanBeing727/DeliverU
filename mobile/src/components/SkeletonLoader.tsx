import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

function SkeletonBone({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const t = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius, backgroundColor: t.colors.secondaryBg, opacity },
        style,
      ]}
    />
  );
}

export default function OrderCardSkeleton() {
  const t = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: t.colors.card, borderRadius: t.radius.lg }, t.shadow.card]}>
      <View style={styles.header}>
        <SkeletonBone width={140} height={20} />
        <SkeletonBone width={80} height={24} borderRadius={12} />
      </View>
      <View style={styles.rows}>
        <View style={styles.row}>
          <SkeletonBone width={60} height={14} />
          <SkeletonBone width={80} height={14} />
        </View>
        <View style={styles.row}>
          <SkeletonBone width={50} height={14} />
          <SkeletonBone width={70} height={14} />
        </View>
        <View style={styles.row}>
          <SkeletonBone width={40} height={14} />
          <SkeletonBone width={90} height={14} />
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: t.colors.secondaryBg }]} />
      <View style={styles.footer}>
        <SkeletonBone width={100} height={12} />
        <SkeletonBone width={14} height={14} borderRadius={7} />
      </View>
    </View>
  );
}

export function OrderListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rows: {
    gap: 10,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
});
