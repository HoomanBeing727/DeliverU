import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FontAwesome5 } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../constants/theme';
import { RootStackParamList } from '../types';
import { toggleDeliverer } from '../api/users';
import { getMyDeliveries } from '../api/orders';
import { hapticMedium } from '../utils/haptics';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const DELIVERY_SENTENCES = {
  day: ["Fuel up—deliveries await.", "Order up—let's get it delivered.", "Grab a bite, then make a run."],
  afternoon: ["Afternoon rush? We've got your delivery.", "Midday cravings—on the way.", "Quick run, hot food."],
  evening: ["Dinner time—let's bring it home.", "Evening vibes, speedy deliveries.", "Warm meals, smooth drop-offs."],
  night: ["Late-night cravings? We deliver.", "Night shift: snacks incoming.", "Quiet campus, fast delivery."],
} as const;

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, refreshUser } = useAuth();
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const [isDelivererMode, setIsDelivererMode] = useState(user?.is_deliverer ?? false);
  const [activeDeliveryCount, setActiveDeliveryCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (user) {
      setIsDelivererMode(user.is_deliverer);
    }
  }, [user?.is_deliverer]);

  useFocusEffect(
    useCallback(() => {
      if (isDelivererMode) {
        getMyDeliveries()
          .then(orders => setActiveDeliveryCount(orders.length))
          .catch(err => console.error('Failed to fetch active deliveries:', err));
      }
    }, [isDelivererMode])
  );

  const handleModeToggle = (targetModeIsDeliverer: boolean) => {
    if (isDelivererMode === targetModeIsDeliverer) return;
    hapticMedium();

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(async () => {
      setIsDelivererMode(targetModeIsDeliverer);
      try {
        await toggleDeliverer(targetModeIsDeliverer);
        await refreshUser();
      } catch {
        Alert.alert('Error', 'Failed to update mode');
        setIsDelivererMode(!targetModeIsDeliverer);
      }

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  };

  const hour = new Date().getHours();
  let bucket: keyof typeof DELIVERY_SENTENCES;
  if (hour >= 6 && hour < 12) bucket = 'day';
  else if (hour >= 12 && hour < 17) bucket = 'afternoon';
  else if (hour >= 17 && hour < 22) bucket = 'evening';
  else bucket = 'night';

  const seed = new Date().getDate();
  const idx = seed % DELIVERY_SENTENCES[bucket].length;
  const deliveryLine = DELIVERY_SENTENCES[bucket][idx];

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + t.spacing.lg }]}>
        <Text style={[t.typography.largeTitle, { color: t.colors.text, marginBottom: 4 }]}>
          Hello, {user?.nickname ?? 'User'}!
        </Text>
        <Text style={[t.typography.footnote, { color: t.colors.subtext, marginBottom: 6 }]}>
          {deliveryLine}
        </Text>
        <Text style={[t.typography.footnote, { color: t.colors.subtext, marginBottom: 16 }]}>
          {user?.dorm_hall}
        </Text>

        <View style={styles.creditsRow}>
          <FontAwesome5 name="coins" solid size={18} color={t.colors.gold} style={styles.creditsIcon} />
          <Text style={[t.typography.headline, { color: t.colors.gold }]}>
            {user?.credits ?? 0} DC
          </Text>
        </View>

        <View style={[styles.toggleContainer, { backgroundColor: t.colors.border }]}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              !isDelivererMode && { backgroundColor: t.colors.accent },
            ]}
            onPress={() => handleModeToggle(false)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleText,
                { color: !isDelivererMode ? '#fff' : t.colors.text },
              ]}
            >
              Orderer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleBtn,
              isDelivererMode && { backgroundColor: t.colors.accent },
            ]}
            onPress={() => handleModeToggle(true)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleText,
                { color: isDelivererMode ? '#fff' : t.colors.text },
              ]}
            >
              Deliverer
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={{ opacity: fadeAnim }}>
        {!isDelivererMode ? (
          <View style={styles.contentContainer}>
            <TouchableOpacity
              style={[
                styles.card,
                styles.heroCard,
                { backgroundColor: t.colors.gold, borderRadius: t.radius.lg },
              ]}
              onPress={() => navigation.navigate('CanteenSelect')}
            >
              <View style={styles.cardHeader}>
                <FontAwesome5 name="utensils" size={28} color="#FFFFFF" style={styles.cardIcon} />
                <View style={styles.cardTextContainer}>
                  <Text style={[t.typography.title3, styles.heroText]}>Order Food</Text>
                  <Text style={[t.typography.callout, styles.heroSubtext]}>
                    Place a new delivery order
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.gridRow}>
              <TouchableOpacity
                style={[
                  styles.gridCard,
                  { backgroundColor: t.colors.card, borderRadius: t.radius.lg },
                  t.shadow.card,
                ]}
                onPress={() => navigation.navigate('LuckyDrawWheel')}
              >
                <FontAwesome5 name="dice" size={24} color={t.colors.orange} style={styles.gridCardIcon} />
                <Text style={[t.typography.subhead, { color: t.colors.text }]}>What to Eat?</Text>
                <Text style={[t.typography.caption, { color: t.colors.subtext, marginTop: 4 }]}>
                  Spin the wheel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.gridCard,
                  {
                    backgroundColor: user?.dorm_hall ? t.colors.card : t.colors.groupedBg,
                    borderRadius: t.radius.lg,
                    opacity: user?.dorm_hall ? 1 : 0.6,
                  },
                  t.shadow.card,
                ]}
                onPress={() => {
                  if (!user?.dorm_hall) {
                    Alert.alert(
                      'Dorm hall required',
                      'Set your dorm hall in Edit Profile to use Group Orders.',
                      [
                        { text: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
                        { text: 'Cancel', style: 'cancel' },
                      ]
                    );
                  } else {
                    navigation.navigate('GroupOrdersHallBoard');
                  }
                }}
              >
                <FontAwesome5 name="users" size={24} color={t.colors.teal} style={styles.gridCardIcon} />
                <Text style={[t.typography.subhead, { color: t.colors.text }]}>Group Orders</Text>
                <Text style={[t.typography.caption, { color: t.colors.subtext, marginTop: 4 }]} numberOfLines={2}>
                  {user?.dorm_hall ? 'Shared hall orders' : 'Set dorm hall first'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: t.colors.card, borderRadius: t.radius.lg },
                t.shadow.card,
              ]}
              onPress={() => navigation.navigate('MyDeliveries')}
            >
              <View style={styles.cardHeader}>
                <FontAwesome5 name="shipping-fast" size={24} color={t.colors.accent} style={styles.cardIcon} />
                <View style={styles.cardTextContainer}>
                  <Text style={[t.typography.headline, { color: t.colors.text }]}>Active Orders</Text>
                  <Text style={[t.typography.callout, { color: t.colors.subtext }]}>
                    {activeDeliveryCount === 0
                      ? 'No active orders'
                      : `${activeDeliveryCount} active order${activeDeliveryCount !== 1 ? 's' : ''}`}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 25,
    padding: 4,
    width: '100%',
  },
  toggleBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  creditsIcon: {
    marginRight: 8,
  },
  contentContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  card: {
    padding: 20,
    marginBottom: 16,
  },
  heroCard: {
    paddingVertical: 28,
  },
  cardHeader: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    marginBottom: 8,
  },
  cardTextContainer: {
    alignItems: 'center',
  },
  heroText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  gridCardIcon: {
    marginBottom: 10,
  },
  bottomSpacer: {
    height: 32,
  },
});
