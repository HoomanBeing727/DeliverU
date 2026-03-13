import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';

import { useTheme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import { getOpenGroupOrders } from '../api/groupOrders';
import { RootStackParamList, Order } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupOrdersHallBoard'>;

export default function GroupOrdersHallBoardScreen({ navigation }: Props) {
  const t = useTheme();
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hall = user?.dorm_hall;

  const loadOrders = useCallback(async () => {
    if (!hall) return;
    try {
      const data = await getOpenGroupOrders(hall);
      setOrders(data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hall]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadOrders();
    }, [loadOrders])
  );

  function renderOrderCard({ item }: { item: Order }) {
    const elapsed = Math.round(
      (Date.now() - new Date(item.created_at).getTime()) / 60000
    );
    const timeLabel = elapsed < 60 ? `${elapsed}m ago` : `${Math.round(elapsed / 60)}h ago`;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: t.colors.card, borderRadius: t.radius.lg }, t.shadow.card]}
        onPress={() => navigation.navigate('GroupOrderDetail', { rootOrderId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <FontAwesome5 name="store" size={16} color={t.colors.accent} />
          <Text style={[t.typography.headline, styles.cardCanteen, { color: t.colors.text }]}>
            {item.canteen}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <FontAwesome5 name="building" size={14} color={t.colors.subtext} />
          <Text style={[t.typography.callout, styles.cardDetail, { color: t.colors.subtext }]}>
            {item.delivery_hall}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <FontAwesome5 name="user" size={14} color={t.colors.subtext} />
          <Text style={[t.typography.callout, styles.cardDetail, { color: t.colors.subtext }]}>
            {item.orderer_nickname}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.cardRow}>
            <FontAwesome5 name="users" size={13} color={t.colors.teal} />
            <Text style={[t.typography.footnote, styles.cardDetail, { color: t.colors.teal }]}>
              {item.participant_count} joined
            </Text>
          </View>
          <Text style={[t.typography.caption, { color: t.colors.muted }]}>{timeLabel}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.colors.bg }]}>
        <ActivityIndicator size="large" color={t.colors.accent} />
      </View>
    );
  }

  if (!hall) {
    return (
      <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
        <AppHeader title="Group Orders" onBack={() => navigation.goBack()} />
        <View style={styles.emptyState}>
          <FontAwesome5 name="exclamation-circle" size={48} color={t.colors.muted} style={styles.emptyIcon} />
          <Text style={[t.typography.callout, { color: t.colors.subtext, textAlign: 'center', marginBottom: 16 }]}>
            Please set your dorm hall to use Group Orders
          </Text>
          <TouchableOpacity
            style={[
              styles.editProfileBtn,
              { backgroundColor: t.colors.accent, borderRadius: t.radius.pill },
            ]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={[t.typography.headline, { color: '#fff' }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <AppHeader title="Group Orders" onBack={() => navigation.goBack()} />

      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome5 name="users-slash" size={48} color={t.colors.muted} style={styles.emptyIcon} />
          <Text style={[t.typography.callout, { color: t.colors.subtext }]}>
            No open group orders right now
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={renderOrderCard}
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
  filterScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  list: {
    padding: 16,
  },
  card: {
    padding: 16,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCanteen: {
    marginLeft: 10,
  },
  cardDetail: {
    marginLeft: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  editProfileBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
});
