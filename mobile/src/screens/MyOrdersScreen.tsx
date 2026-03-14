import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../constants/theme';
import AppHeader from '../components/AppHeader';
import { getMyOrders } from '../api/orders';
import OrderCard from '../components/OrderCard';
import { OrderListSkeleton } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, Order, OrderStatus } from '../types';
import { hapticSelection } from '../utils/haptics';

type FilterKey = 'all' | 'active' | 'completed' | 'cancelled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function matchesFilter(order: Order, filter: FilterKey): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'active':
      return order.status === 'pending' || order.status === 'accepted' || order.status === 'picked_up';
    case 'completed':
      return order.status === 'delivered';
    case 'cancelled':
      return order.status === 'cancelled';
  }
}

export default function MyOrdersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const t = useTheme();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const filteredOrders = useMemo(
    () => orders.filter((o) => matchesFilter(o, activeFilter)),
    [orders, activeFilter]
  );

  async function loadOrders() {
    try {
      const data = await getMyOrders();
      setOrders(data);
    } catch (err) {
      console.log('Failed to load my orders', err);
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
      <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
        <AppHeader title="My Orders" />
        <OrderListSkeleton count={4} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <AppHeader title="My Orders" />

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive ? t.colors.accent : t.colors.card,
                    borderRadius: t.radius.pill,
                    borderWidth: isActive ? 0 : 1,
                    borderColor: t.colors.border,
                  },
                ]}
                onPress={() => { hapticSelection(); setActiveFilter(f.key); }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    t.typography.subhead,
                    { color: isActive ? '#FFFFFF' : t.colors.text },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
          />
        )}
        contentContainerStyle={filteredOrders.length === 0 ? styles.emptyList : styles.list}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadOrders();
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: t.colors.accentLight }]}>
              <FontAwesome5
                name={activeFilter === 'cancelled' ? 'ban' : activeFilter === 'completed' ? 'check-circle' : 'clipboard-list'}
                size={36}
                color={t.colors.accent}
              />
            </View>
            <Text style={[t.typography.title3, { color: t.colors.text, marginTop: 20, marginBottom: 8 }]}>
              {activeFilter === 'all' ? 'No Orders Yet' : `No ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Orders`}
            </Text>
            <Text style={[t.typography.callout, { color: t.colors.subtext, textAlign: 'center' }]}>
              {activeFilter === 'all'
                ? 'Your orders will appear here once you place one.'
                : `You don't have any ${activeFilter} orders yet.`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    paddingVertical: 12,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  list: {
    padding: 16,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
