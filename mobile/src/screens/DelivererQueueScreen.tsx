import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getDelivererQueue } from '../api/orders';
import OrderCard from '../components/OrderCard';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, Order } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DelivererQueue'>;

export default function DelivererQueueScreen({ navigation }: Props) {
  const { user } = useAuth();
  const isDark = user?.dark_mode ?? false;
  
  const colors = isDark
    ? { bg: '#1a1a2e', card: '#16213e', text: '#eee', sub: '#aaa', accent: '#0f3460' }
    : { bg: '#f5f5f5', card: '#fff', text: '#333', sub: '#666', accent: '#003366' };

const [orders, setOrders] = useState<Order[]>([]);
const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<'preference' | 'time'>('preference');

  const sortedOrders = useMemo(() => {
    if (orders.length === 0) return [];

    // By Time: Earliest created first (ascending)
    if (sortMode === 'time') {
      return [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at));
    }

    // By Preference
    const prefs = user?.preferred_delivery_halls;

    // Null-safe check: if no prefs, behave like "By Time"
    if (!prefs || prefs.length === 0) {
      return [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at));
    }

    return [...orders].sort((a, b) => {
      const indexA = prefs.indexOf(a.delivery_hall);
      const indexB = prefs.indexOf(b.delivery_hall);

      const hasA = indexA !== -1;
      const hasB = indexB !== -1;

      // Both in prefs: lower index = higher priority (earlier in array)
      if (hasA && hasB) {
        if (indexA !== indexB) return indexA - indexB;
        // Same priority tier: sort by time
        return a.created_at.localeCompare(b.created_at);
      }

      // Only A in prefs: A comes first
      if (hasA) return -1;
      
      // Only B in prefs: B comes first
      if (hasB) return 1;

      // Neither in prefs: sort by time
      return a.created_at.localeCompare(b.created_at);
    });
  }, [orders, sortMode, user?.preferred_delivery_halls]);

  async function loadOrders() {
    try {
      const data = await getDelivererQueue();
      setOrders(data);
    } catch (err) {
      // Quiet failure on refresh, alert on initial load if needed
      if (loading) {
         // Maybe don't alert every time, just log or show empty
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Available Orders</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Sort Toggle */}
      <View style={[styles.toggleContainer, { backgroundColor: isDark ? '#2a2a40' : '#e0e0e0' }]}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            sortMode === 'preference' && { backgroundColor: colors.accent },
          ]}
          onPress={() => setSortMode('preference')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.toggleText,
              { color: sortMode === 'preference' ? '#fff' : colors.text },
            ]}
          >
            By Preference
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            sortMode === 'time' && { backgroundColor: colors.accent },
          ]}
          onPress={() => setSortMode('time')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.toggleText,
              { color: sortMode === 'time' ? '#fff' : colors.text },
            ]}
          >
            By Time
          </Text>
        </TouchableOpacity>
      </View>

      {sortedOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.sub }]}>
            No orders available for delivery right now
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
              colors={colors}
            />
          )}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadOrders();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingTop: 60, // approximate status bar height
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 25,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
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
  list: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
