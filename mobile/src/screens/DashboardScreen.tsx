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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../constants/theme';
import { RootStackParamList } from '../types';
import { toggleDarkMode, toggleDeliverer } from '../api/users';
import { getLeaderboard } from '../api/stats';
import { getMyDeliveries } from '../api/orders';
import { LeaderboardResponse } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const { user, logout, refreshUser } = useAuth();
  const t = useTheme();
  const insets = useSafeAreaInsets();

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
    }, [isDelivererMode])
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
    <ScrollView style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + t.spacing.lg }]}>
        <Text style={[t.typography.largeTitle, { color: t.colors.text, marginBottom: 4 }]}>
          Hello, {user?.nickname ?? 'User'}!
        </Text>
        <Text style={[t.typography.footnote, { color: t.colors.subtext, marginBottom: 16 }]}>
          {user?.dorm_hall}
        </Text>

        <Text style={[t.typography.headline, { color: t.colors.accent, marginBottom: 24 }]}>
          {user?.credits ?? 0} DC
        </Text>

        {/* Toggle Switch */}
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
        {/* Conditional Content */}
        {!isDelivererMode ? (
          /* Orderer View */
          <View style={styles.contentContainer}>
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: t.colors.card, borderRadius: t.radius.lg },
                t.shadow.card
              ]}
              onPress={() => navigation.navigate('CanteenSelect')}
            >
              <View style={styles.cardHeader}>
                <FontAwesome5 name="utensils" size={24} color={t.colors.accent} style={styles.cardIcon} />
                <View style={styles.cardTextContainer}>
                  <Text style={[t.typography.headline, { color: t.colors.text }]}>Order Food</Text>
                  <Text style={[t.typography.callout, { color: t.colors.subtext }]}>
                    Place a new delivery order
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: t.colors.card, borderRadius: t.radius.lg },
                t.shadow.card
              ]}
              onPress={() => navigation.navigate('MyOrders')}
            >
              <View style={styles.cardHeader}>
                <FontAwesome5 name="list-alt" size={24} color={t.colors.purple} style={styles.cardIcon} />
                <View style={styles.cardTextContainer}>
                  <Text style={[t.typography.headline, { color: t.colors.text }]}>My Orders</Text>
                  <Text style={[t.typography.callout, { color: t.colors.subtext }]}>
                    Track your active and past orders
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          /* Deliverer View */
          <View style={styles.contentContainer}>
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: t.colors.card, borderRadius: t.radius.lg },
                t.shadow.card
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

            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: t.colors.card, borderRadius: t.radius.lg },
                t.shadow.card
              ]}
              onPress={() => navigation.navigate('DelivererQueue')}
            >
              <View style={styles.cardHeader}>
                <FontAwesome5 name="search" size={24} color={t.colors.teal} style={styles.cardIcon} />
                <View style={styles.cardTextContainer}>
                  <Text style={[t.typography.headline, { color: t.colors.text }]}>Available Orders</Text>
                  <Text style={[t.typography.callout, { color: t.colors.subtext }]}>
                    Browse orders to deliver
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Leaderboard Section */}
      <View style={[styles.sectionContainer, { marginHorizontal: 24, marginBottom: 16 }]}>
        <View style={styles.sectionHeaderRow}>
          <FontAwesome5 name="trophy" size={16} color={t.colors.orange} style={{ marginRight: 8 }} />
          <Text style={[t.typography.title3, { color: t.colors.text }]}>Leaderboard</Text>
        </View>

        {/* Top Orderers */}
        <TouchableOpacity 
          style={[
            styles.sectionCard, 
            { backgroundColor: t.colors.card, borderRadius: t.radius.lg, marginBottom: 16 },
            t.shadow.card
          ]}
          onPress={() => navigation.navigate('Leaderboard', { initialTab: 'orderers' })}
          activeOpacity={0.7}
        >
          <Text style={[t.typography.headline, { color: t.colors.text, textAlign: 'center', marginBottom: 12 }]}>Top Orderers</Text>
          {leaderboard?.top_orderers && leaderboard.top_orderers.length > 0 ? (
            leaderboard.top_orderers.map((entry, index) => (
              <View key={entry.user_id} style={[styles.leaderboardRow, { borderBottomColor: t.colors.separator }]}>
                <Text style={[styles.leaderboardText, { color: t.colors.text }]}>
                  #{index + 1} {entry.nickname}
                </Text>
                <Text style={[styles.leaderboardValue, { color: t.colors.subtext }]}>
                  {entry.value} orders
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: t.colors.subtext, textAlign: 'center', marginTop: 8 }]}>No data yet</Text>
          )}
        </TouchableOpacity>

        {/* Top Deliverers */}
        <TouchableOpacity 
          style={[
            styles.sectionCard, 
            { backgroundColor: t.colors.card, borderRadius: t.radius.lg },
            t.shadow.card
          ]}
          onPress={() => navigation.navigate('Leaderboard', { initialTab: 'deliverers' })}
          activeOpacity={0.7}
        >
          <Text style={[t.typography.headline, { color: t.colors.text, textAlign: 'center', marginBottom: 12 }]}>Top Deliverers</Text>
          {leaderboard?.top_deliverers && leaderboard.top_deliverers.length > 0 ? (
            leaderboard.top_deliverers.map((entry, index) => (
              <View key={entry.user_id} style={[styles.leaderboardRow, { borderBottomColor: t.colors.separator }]}>
                <Text style={[styles.leaderboardText, { color: t.colors.text }]}>
                  #{index + 1} {entry.nickname}
                </Text>
                <Text style={[styles.leaderboardValue, { color: t.colors.subtext }]}>
                  {Number(entry.value).toFixed(1)} ★
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: t.colors.subtext, textAlign: 'center', marginTop: 8 }]}>No data yet</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Settings */}
      <View style={[styles.sectionContainer, { marginHorizontal: 24, marginBottom: 32 }]}>
        <Text style={[t.typography.title3, { color: t.colors.text, marginBottom: 12, marginLeft: 4 }]}>Settings</Text>

        <View style={[styles.settingsGroup, { backgroundColor: t.colors.card, borderRadius: t.radius.lg }, t.shadow.card]}>
          <View style={[styles.settingRow, { borderBottomColor: t.colors.separator }]}>
            <View style={styles.settingLabelContainer}>
              <FontAwesome5 name="moon" size={16} color={t.colors.indigo} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: t.colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={user?.dark_mode ?? false}
              onValueChange={handleDarkToggle}
              trackColor={{ false: t.colors.secondaryBg, true: t.colors.accent }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: t.colors.separator }]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.settingLabelContainer}>
              <FontAwesome5 name="user-edit" size={16} color={t.colors.accent} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: t.colors.text }]}>Edit Profile</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={14} color={t.colors.subtext} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomWidth: 0 }]} 
            onPress={handleLogout}
          >
            <View style={styles.settingLabelContainer}>
              <FontAwesome5 name="sign-out-alt" size={16} color={t.colors.danger} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: t.colors.danger }]}>Sign Out</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={14} color={t.colors.subtext} />
          </TouchableOpacity>
        </View>
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
  contentContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  card: {
    padding: 20,
    marginBottom: 16,
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
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    padding: 20,
    alignItems: 'stretch',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  settingsGroup: {
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
    width: 20, 
    textAlign: 'center',
  },
  settingLabel: {
    fontSize: 17,
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
