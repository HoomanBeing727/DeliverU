import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Order } from '../types';
import { useTheme } from '../constants/theme';

interface Props {
  order: Order;
  onPress: () => void;
}

export default function OrderCard({ order, onPress }: Props) {
  const t = useTheme();
  const itemCount = order.items.reduce((acc, item) => acc + item.qty, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'accepted': return '#2196f3';
      case 'picked_up': return '#9c27b0';
      case 'delivered': return '#4caf50';
      case 'cancelled': return '#f44336';
      default: return t.colors.subtext;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min ago";
    return Math.floor(seconds) + " sec ago";
  };

  const statusColor = getStatusColor(order.status);

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: t.colors.card }, t.shadow.card]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={[styles.canteen, { color: t.colors.text }]}>{order.canteen}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}> 
          <Text style={[styles.statusText, { color: statusColor }]}>
            {order.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: t.colors.subtext }]}>Items</Text>
          <Text style={[styles.value, { color: t.colors.text }]}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </Text>
        </View>
        
        <View style={styles.row}>
          <Text style={[styles.label, { color: t.colors.subtext }]}>Total</Text>
          <Text style={[styles.price, { color: t.colors.accent }]}>
            HK${order.total_price.toFixed(1)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: t.colors.subtext }]}>To</Text>
          <Text style={[styles.value, { color: t.colors.text }]}>
            {order.delivery_hall}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: t.colors.bg }]} />

      <View style={styles.footer}>
        <Text style={[styles.meta, { color: t.colors.subtext }]}>
          by {order.orderer_nickname}
        </Text>
        <Text style={[styles.meta, { color: t.colors.subtext }]}>
          {getTimeAgo(order.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  canteen: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    fontSize: 12,
  }
});
