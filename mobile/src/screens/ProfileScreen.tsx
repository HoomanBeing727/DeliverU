import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FontAwesome5 } from '@expo/vector-icons';

import Constants from 'expo-constants';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../constants/theme';
import { RootStackParamList } from '../types';
import { toggleDarkMode } from '../api/users';
import { getMyOrders, getMyDeliveries } from '../api/orders';
import { hapticLight, hapticMedium } from '../utils/haptics';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, logout, refreshUser } = useAuth();
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const [orderCount, setOrderCount] = useState(0);
  const [deliveryCount, setDeliveryCount] = useState(0);

  const initial = (user?.nickname ?? 'U').charAt(0).toUpperCase();

  useFocusEffect(
    useCallback(() => {
      getMyOrders()
        .then((orders) => setOrderCount(orders.length))
        .catch(() => {});
      getMyDeliveries()
        .then((deliveries) => setDeliveryCount(deliveries.length))
        .catch(() => {});
    }, [])
  );

  async function handleDarkToggle(value: boolean) {
    hapticMedium();
    try {
      await toggleDarkMode(value);
      await refreshUser();
    } catch {
      Alert.alert('Error', 'Failed to update dark mode');
    }
  }

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + t.spacing.lg }]}>
        <Text style={[t.typography.largeTitle, { color: t.colors.text }]}>Profile</Text>
      </View>

      <View style={[styles.userCard, { backgroundColor: t.colors.card, borderRadius: t.radius.lg }, t.shadow.card]}>
        <View style={[styles.avatar, { backgroundColor: t.colors.accent }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[t.typography.title3, { color: t.colors.text }]}>
            {user?.nickname ?? 'User'}
          </Text>
          <Text style={[t.typography.footnote, { color: t.colors.subtext, marginTop: 2 }]}>
            {user?.email ?? ''}
          </Text>
          {user?.dorm_hall ? (
            <Text style={[t.typography.footnote, { color: t.colors.subtext, marginTop: 2 }]}>
              {user.dorm_hall}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.statsRow, { marginHorizontal: 24, marginBottom: 24 }]}>
        <View style={[styles.statCard, { backgroundColor: t.colors.card, borderRadius: t.radius.lg }, t.shadow.card]}>
          <Text style={[t.typography.title2, { color: t.colors.gold }]}>{user?.credits ?? 0}</Text>
          <Text style={[t.typography.caption, { color: t.colors.subtext, marginTop: 2 }]}>Credits</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: t.colors.card, borderRadius: t.radius.lg }, t.shadow.card]}>
          <Text style={[t.typography.title2, { color: t.colors.accent }]}>{orderCount}</Text>
          <Text style={[t.typography.caption, { color: t.colors.subtext, marginTop: 2 }]}>Orders</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: t.colors.card, borderRadius: t.radius.lg }, t.shadow.card]}>
          <Text style={[t.typography.title2, { color: t.colors.success }]}>{deliveryCount}</Text>
          <Text style={[t.typography.caption, { color: t.colors.subtext, marginTop: 2 }]}>Deliveries</Text>
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={[t.typography.title3, { color: t.colors.text, marginBottom: 12, marginLeft: 4 }]}>
          Settings
        </Text>

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
            style={[styles.settingRow, { borderBottomColor: t.colors.separator }]}
            onPress={() => navigation.navigate('Leaderboard')}
          >
            <View style={styles.settingLabelContainer}>
              <FontAwesome5 name="trophy" size={16} color={t.colors.orange} style={styles.settingIcon} />
              <Text style={[styles.settingLabel, { color: t.colors.text }]}>Leaderboard</Text>
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

      <Text style={[styles.versionText, { color: t.colors.muted }]}>
        DeliverU v{Constants.expoConfig?.version ?? '1.0.0'}
      </Text>

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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  sectionContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
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
  bottomSpacer: {
    height: 32,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 24,
  },
});
