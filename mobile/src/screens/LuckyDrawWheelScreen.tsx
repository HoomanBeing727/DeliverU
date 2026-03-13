import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path, Text as SvgText, G, Circle } from 'react-native-svg';

import { useTheme } from '../constants/theme';
import AppHeader from '../components/AppHeader';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'LuckyDrawWheel'>;

const CANTEENS = ['LG1', 'LSK', 'Asia Pacific', "Oliver's"];
const WHEEL_SIZE = 280;
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const CENTER = WHEEL_RADIUS;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export default function LuckyDrawWheelScreen({ navigation }: Props) {
  const t = useTheme();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const currentAngle = useRef(0);

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const segmentAngle = 360 / CANTEENS.length;
  const SEGMENT_COLORS = [t.colors.orange, t.colors.info, t.colors.purple, t.colors.success];

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    const extraRotations = 3 + Math.random() * 3;
    const randomOffset = Math.random() * 360;
    const totalDegrees = extraRotations * 360 + randomOffset;
    const newAngle = currentAngle.current + totalDegrees;

    spinAnim.setValue(currentAngle.current);

    Animated.timing(spinAnim, {
      toValue: newAngle,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      currentAngle.current = newAngle;
      const normalised = ((newAngle % 360) + 360) % 360;
      const pointerAngle = (360 - normalised + segmentAngle / 2) % 360;
      const idx = Math.floor(pointerAngle / segmentAngle) % CANTEENS.length;
      setResult(CANTEENS[idx]);
      setSpinning(false);
    });
  }

  const rotation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const RING_PADDING = 8;
  const OUTER_SIZE = WHEEL_SIZE + RING_PADDING * 2;

  return (
    <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <AppHeader title="What Should I Eat?" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: t.colors.card, borderRadius: t.radius.lg }, t.shadow.card]}>
          <Text style={[t.typography.callout, styles.subtitle, { color: t.colors.subtext }]}>
            {result ? 'You should eat at:' : 'Spin the wheel to decide!'}
          </Text>

          {result && (
            <Text style={[t.typography.title1, styles.resultText, { color: t.colors.accent }]}>
              {result}
            </Text>
          )}

          <View style={styles.wheelWrapper}>
            <View style={[styles.pointer, { borderTopColor: t.colors.text }]} />
            <View style={[styles.wheelRing, { width: OUTER_SIZE, height: OUTER_SIZE, borderRadius: OUTER_SIZE / 2, borderColor: t.colors.border }]}>
              <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
                  {CANTEENS.map((canteen, i) => {
                    const startAngle = i * segmentAngle;
                    const endAngle = startAngle + segmentAngle;
                    const midAngle = startAngle + segmentAngle / 2;
                    const labelPos = polarToCartesian(CENTER, CENTER, WHEEL_RADIUS * 0.6, midAngle);
                    return (
                      <G key={canteen}>
                        <Path d={describeArc(CENTER, CENTER, WHEEL_RADIUS, startAngle, endAngle)} fill={SEGMENT_COLORS[i]} />
                        <SvgText
                          x={labelPos.x}
                          y={labelPos.y}
                          fill="#fff"
                          fontSize={14}
                          fontWeight="700"
                          textAnchor="middle"
                          alignmentBaseline="central"
                        >
                          {canteen}
                        </SvgText>
                      </G>
                    );
                  })}
                  <Circle cx={CENTER} cy={CENTER} r={28} fill={t.colors.card} />
                  <Circle cx={CENTER} cy={CENTER} r={10} fill={t.colors.accent} />
                </Svg>
              </Animated.View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.spinButton,
              {
                backgroundColor: spinning ? t.colors.muted : t.colors.accent,
                borderRadius: t.radius.pill,
              },
              t.shadow.floating,
            ]}
            onPress={spin}
            disabled={spinning}
            activeOpacity={0.8}
          >
            <Text style={[t.typography.headline, styles.spinButtonText]}>
              {spinning ? 'Spinning...' : result ? 'Spin Again' : 'SPIN!'}
            </Text>
          </TouchableOpacity>

          {result && !spinning && (
            <TouchableOpacity
              style={[
                styles.orderButton,
                {
                  backgroundColor: t.colors.success,
                  borderRadius: t.radius.pill,
                },
                t.shadow.card,
              ]}
              onPress={() => navigation.navigate('CanteenSelect')}
              activeOpacity={0.8}
            >
              <Text style={[t.typography.headline, styles.spinButtonText]}>Order Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    alignItems: 'center',
    padding: 24,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  resultText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  wheelWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: -4,
    zIndex: 1,
  },
  wheelRing: {
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinButton: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    marginBottom: 12,
  },
  spinButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
  orderButton: {
    paddingHorizontal: 48,
    paddingVertical: 16,
  },
});
