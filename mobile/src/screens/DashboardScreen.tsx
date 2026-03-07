import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';
import { toggleDarkMode, toggleDeliverer } from '../api/users';
import { getLeaderboard } from '../api/stats';
import { getMyDeliveries } from '../api/orders';
import { LeaderboardResponse } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const { user, logout, refreshUser } = useAuth();

  const isDark = user?.dark_mode ?? false;
  const colors = isDark
    ? { bg: '#1a1a2e', card: '#16213e', text: '#eee', sub: '#aaa', accent: '#0f3460' , dm_accent: '#eee' }
    : { bg: '#f5f5f5', card: '#fff', text: '#333', sub: '#666', accent: '#003366'};

  // Local state for toggle, initialized from user profile
  const [isDelivererMode, setIsDelivererMode] = useState(user?.is_deliverer ?? false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [activeDeliveryCount, setActiveDeliveryCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Sync local state if user profile updates externally (optional but good practice)
  useEffect(() => {
    if (user) {
      setIsDelivererMode(user.is_deliverer);
    }
  }, [user?.is_deliverer]);

  useFocusEffect(
    useCallback(() => {
      getLeaderboard()
        .then(setLeaderboard)
        .catch(err => console.error('Failed to fetch leaderboard:', err));
      if (isDelivererMode) {
        getMyDeliveries()
          .then(orders => setActiveDeliveryCount(orders.length))
          .catch(err => console.error('Failed to fetch active deliveries:', err));
      }
    }, [])
  );

  async function handleDarkToggle(value: boolean) {
    try {
      await toggleDarkMode(value);
      await refreshUser();
    } catch {
      Alert.alert('Error', 'Failed to update dark mode');
    }
  }

  const handleModeToggle = (targetModeIsDeliverer: boolean) => {
    if (isDelivererMode === targetModeIsDeliverer) return;

    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(async () => {
      // Switch mode and API call
      setIsDelivererMode(targetModeIsDeliverer);
      try {
        await toggleDeliverer(targetModeIsDeliverer);
        await refreshUser();
      } catch (error) {
        Alert.alert('Error', 'Failed to update mode');
        setIsDelivererMode(!targetModeIsDeliverer); // Revert on failure
      }

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  };

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          Hello, {user?.nickname ?? 'User'}!
        </Text>
        <Text style={[styles.subGreeting, { color: colors.sub }]}>
          {user?.dorm_hall}
        </Text>

        <Text style={[styles.creditsText, { color: colors.accent }]}>
          {user?.credits ?? 0} DC
        </Text>

        {/* Toggle Switch */}
        <View style={[styles.toggleContainer, { backgroundColor: isDark ? '#2a2a40' : '#e0e0e0' }]}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              !isDelivererMode && { backgroundColor: colors.accent },
            ]}
            onPress={() => handleModeToggle(false)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleText,
                { color: !isDelivererMode ? '#fff' : colors.text },
              ]}
            >
              Orderer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleBtn,
              isDelivererMode && { backgroundColor: colors.accent },
            ]}
            onPress={() => handleModeToggle(true)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleText,
                { color: isDelivererMode ? '#fff' : colors.text },
              ]}
            >
              Deliverer
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Conditional Content */}
        {!isDelivererMode ? (
          /* Orderer View */
          <View style={styles.contentContainer}>
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('CanteenSelect')}
            >
              <Text style={[styles.cardTitle, { color: colors.dm_accent }]}>Order Food</Text>
              <Text style={[styles.cardDesc, { color: colors.sub }]}>
                Place a new delivery order
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('MyOrders')}
            >
              <Text style={[styles.cardTitle, { color: colors.dm_accent }]}>My Orders</Text>
              <Text style={[styles.cardDesc, { color: colors.sub }]}>
                Track your active and past orders
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Deliverer View */
          <View style={styles.contentContainer}>
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('MyDeliveries')}
            >
              <Text style={[styles.cardTitle, { color: colors.dm_accent }]}>Active Orders</Text>
              <Text style={[styles.cardDesc, { color: colors.sub }]}>
                {activeDeliveryCount === 0
                  ? 'No active orders'
                  : `${activeDeliveryCount} active order${activeDeliveryCount !== 1 ? 's' : ''}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('DelivererQueue')}
            >
              <Text style={[styles.cardTitle, { color: colors.dm_accent }]}>Available Orders</Text>
              <Text style={[styles.cardDesc, { color: colors.sub }]}>
                Browse orders to deliver
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Leaderboard Section */}
      <View style={[styles.section, { backgroundColor: colors.bg, padding: 0, shadowOpacity: 0, elevation: 0 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 4 }]}>Leaderboard</Text>

        {/* Top Orderers */}
        <View style={[styles.card, { backgroundColor: colors.card, alignItems: 'stretch' }]}>
          <Text style={[styles.cardTitle, { color: colors.dm_accent, textAlign: 'center', fontSize: 18 }]}>Top Orderers</Text>
          {leaderboard?.top_orderers && leaderboard.top_orderers.length > 0 ? (
            leaderboard.top_orderers.map((entry, index) => (
              <View key={entry.user_id} style={[styles.leaderboardRow, { borderBottomColor: isDark ? '#333' : '#eee' }]}>
                <Text style={[styles.leaderboardText, { color: colors.text }]}>
                  #{index + 1} {entry.nickname}
                </Text>
                <Text style={[styles.leaderboardValue, { color: colors.sub }]}>
                  {entry.value} orders
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.sub, textAlign: 'center', marginTop: 8 }]}>No data yet</Text>
          )}
        </View>

        {/* Top Deliverers */}
        <View style={[styles.card, { backgroundColor: colors.card, alignItems: 'stretch' }]}>
          <Text style={[styles.cardTitle, { color: colors.dm_accent, textAlign: 'center', fontSize: 18 }]}>Top Deliverers</Text>
          {leaderboard?.top_deliverers && leaderboard.top_deliverers.length > 0 ? (
            leaderboard.top_deliverers.map((entry, index) => (
              <View key={entry.user_id} style={[styles.leaderboardRow, { borderBottomColor: isDark ? '#333' : '#eee' }]}>
                <Text style={[styles.leaderboardText, { color: colors.text }]}>
                  #{index + 1} {entry.nickname}
                </Text>
                <Text style={[styles.leaderboardValue, { color: colors.sub }]}>
                  {Number(entry.value).toFixed(1)} ★
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.sub, textAlign: 'center', marginTop: 8 }]}>No data yet</Text>
          )}
        </View>
      </View>
      {/* Settings */}
      <View style={[styles.section, { backgroundColor: colors.card, marginTop: 16 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>

        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={handleDarkToggle}
            trackColor={{ false: '#ccc', true: colors.accent }}
            thumbColor="#fff"
          />
        </View>

        {/* Deliverer Mode Switch REMOVED */}

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={[styles.settingLabel, { color: colors.text }]}>Edit Profile</Text>
          <Text style={[styles.chevron, { color: colors.sub }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
          <Text style={[styles.settingLabel, { color: '#cc3333' }]}>Sign Out</Text>
          <Text style={[styles.chevron, { color: '#cc3333' }]}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
  },
  subGreeting: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  creditsText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
  contentContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 15,
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 15,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
  },
  leaderboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leaderboardText: {
    fontSize: 15,
    fontWeight: '500',
  },
  leaderboardValue: {
    fontSize: 15,
  },
});
