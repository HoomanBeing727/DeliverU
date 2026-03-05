import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { toggleDarkMode, toggleDeliverer } from '../api/users';

export default function DashboardScreen() {
  const { user, logout, refreshUser } = useAuth();

  const isDark = user?.dark_mode ?? false;
  const colors = isDark
    ? { bg: '#1a1a2e', card: '#16213e', text: '#eee', sub: '#aaa', accent: '#0f3460' }
    : { bg: '#f5f5f5', card: '#fff', text: '#333', sub: '#666', accent: '#003366' };

  async function handleDarkToggle(value: boolean) {
    try {
      await toggleDarkMode(value);
      await refreshUser();
    } catch {
      Alert.alert('Error', 'Failed to update dark mode');
    }
  }

  async function handleDelivererToggle(value: boolean) {
    try {
      await toggleDeliverer(value);
      await refreshUser();
    } catch {
      Alert.alert('Error', 'Failed to update deliverer status');
    }
  }

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
          {user?.dorm_hall} — {user?.is_deliverer ? 'Orderer & Deliverer' : 'Orderer'}
        </Text>
      </View>

      {/* Action Cards */}
      <View style={styles.cardRow}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => Alert.alert('Coming Soon', 'Order creation is not yet implemented.')}
        >
          <Text style={[styles.cardTitle, { color: colors.accent }]}>Order Food</Text>
          <Text style={[styles.cardDesc, { color: colors.sub }]}>
            Place a new delivery order
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => Alert.alert('Coming Soon', 'Deliverer queue is not yet implemented.')}
        >
          <Text style={[styles.cardTitle, { color: colors.accent }]}>Deliver</Text>
          <Text style={[styles.cardDesc, { color: colors.sub }]}>
            Find orders to deliver
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Orders placeholder */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Orders</Text>
        <Text style={[styles.emptyText, { color: colors.sub }]}>No active orders</Text>
      </View>

      {/* Settings */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
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

        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Deliverer Mode</Text>
          <Switch
            value={user?.is_deliverer ?? false}
            onValueChange={handleDelivererToggle}
            trackColor={{ false: '#ccc', true: colors.accent }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => Alert.alert('Coming Soon', 'Profile editing is not yet implemented.')}
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
  },
  cardRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
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
});
