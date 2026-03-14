import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../constants/theme';
import AppHeader from '../components/AppHeader';
import { getDelivererQueue } from '../api/orders';
import OrderCard from '../components/OrderCard';
import { OrderListSkeleton } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, Order } from '../types';
import { hapticSelection } from '../utils/haptics';

export default function DelivererQueueScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const t = useTheme();
  const { user } = useAuth();

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

    const prefs = user?.preferred_delivery_halls;

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
      <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
        <AppHeader title="Available Orders" />
        <OrderListSkeleton count={4} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <AppHeader title="Available Orders" />

      {/* Sort Toggle */}
      <View style={[
        styles.toggleContainer, 
        { 
          backgroundColor: t.colors.groupedBg,
          borderRadius: t.radius.pill,
          ...t.shadow.subtle 
        }
      ]}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            sortMode === 'preference' && { backgroundColor: t.colors.accent },
            { borderRadius: t.radius.pill }
          ]}
          onPress={() => { hapticSelection(); setSortMode('preference'); }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              t.typography.subhead,
              { color: sortMode === 'preference' ? '#fff' : t.colors.text },
            ]}
          >
            By Preference
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            sortMode === 'time' && { backgroundColor: t.colors.accent },
            { borderRadius: t.radius.pill }
          ]}
          onPress={() => { hapticSelection(); setSortMode('time'); }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              t.typography.subhead,
              { color: sortMode === 'time' ? '#fff' : t.colors.text },
            ]}
          >
            By Time
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            variant="deliverer"
            onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
          />
        )}
        contentContainerStyle={sortedOrders.length === 0 ? styles.emptyList : styles.list}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadOrders();
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: t.colors.accentLight }]}>
              <FontAwesome5 name="inbox" size={36} color={t.colors.accent} />
            </View>
            <Text style={[t.typography.title3, { color: t.colors.text, marginTop: 20, marginBottom: 8 }]}>
              No Orders Right Now
            </Text>
            <Text style={[t.typography.callout, { color: t.colors.subtext, textAlign: 'center', paddingHorizontal: 32 }]}>
              New delivery requests from your hall will appear here. Pull down to refresh.
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
  toggleContainer: {
    flexDirection: 'row',
    height: 44,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
