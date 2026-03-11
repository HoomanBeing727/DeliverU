import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../constants/theme';
import AppHeader from '../components/AppHeader';
import { getMyDeliveries } from '../api/orders';
import OrderCard from '../components/OrderCard';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, Order } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'MyDeliveries'>;

export default function MyDeliveriesScreen({ navigation }: Props) {
  const t = useTheme();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadOrders() {
    try {
      const data = await getMyDeliveries();
      setOrders(data);
    } catch (err) {
      if (loading) {
         // Quiet failure on refresh
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
      <View style={[styles.center, { backgroundColor: t.colors.bg }]}>
        <ActivityIndicator size="large" color={t.colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <AppHeader title="My Deliveries" onBack={navigation.goBack} />

{orders.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome5 name="truck" size={48} color={t.colors.muted} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: t.colors.subtext, ...t.typography.body }]}>
            No active deliveries
          </Text>
</View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
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
    textAlign: 'center',
    marginTop: 8,
  },
});
