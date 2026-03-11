import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
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
      case 'pending': return t.colors.statusPending;
      case 'accepted': return t.colors.statusAccepted;
      case 'picked_up': return t.colors.statusPickedUp;
      case 'delivered': return t.colors.statusDelivered;
      case 'cancelled': return t.colors.statusCancelled;
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
      style={[
        styles.card, 
        { 
          backgroundColor: t.colors.card,
          borderRadius: t.radius.lg,
          padding: t.spacing.md,
          marginVertical: t.spacing.sm,
          marginHorizontal: t.spacing.xs,
        },
        t.shadow.card
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.header, { marginBottom: t.spacing.md }]}>
        <Text style={[styles.canteen, t.typography.title3, { color: t.colors.text, marginRight: t.spacing.sm }]}>
          {order.canteen}
        </Text>
        <View style={[styles.badge, { backgroundColor: statusColor + '20', borderRadius: t.radius.sm, paddingHorizontal: t.spacing.sm, paddingVertical: t.spacing.xs }]}> 
          <Text style={[styles.statusText, t.typography.caption2, { color: statusColor, fontWeight: '800' }]}>
            {order.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={[styles.content, { marginBottom: t.spacing.md }]}>
        <View style={[styles.row, { marginBottom: t.spacing.xs }]}>
          <View style={styles.iconLabel}>
            <FontAwesome5 name="utensils" size={13} color={t.colors.subtext} style={{ width: 20 }} />
            <Text style={[styles.label, t.typography.body, { color: t.colors.subtext }]}>Items</Text>
          </View>
          <Text style={[styles.value, t.typography.subhead, { color: t.colors.text }]}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </Text>
        </View>
        
        <View style={[styles.row, { marginBottom: t.spacing.xs }]}>
          <View style={styles.iconLabel}>
            <FontAwesome5 name="dollar-sign" size={13} color={t.colors.accent} style={{ width: 20 }} />
            <Text style={[styles.label, t.typography.body, { color: t.colors.subtext }]}>Total</Text>
          </View>
          <Text style={[styles.price, t.typography.headline, { color: t.colors.accent }]}>
            HK${order.total_price.toFixed(1)}
          </Text>
        </View>

        <View style={[styles.row, { marginBottom: t.spacing.xs }]}>
          <View style={styles.iconLabel}>
            <FontAwesome5 name="map-marker-alt" size={13} color={t.colors.subtext} style={{ width: 20 }} />
            <Text style={[styles.label, t.typography.body, { color: t.colors.subtext }]}>To</Text>
          </View>
          <Text style={[styles.value, t.typography.subhead, { color: t.colors.text }]}>
            {order.delivery_hall}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: t.colors.bg, marginBottom: t.spacing.md }]} />

      <View style={styles.footer}>
        <View>
          <Text style={[styles.meta, t.typography.caption, { color: t.colors.subtext }]}>
            by {order.orderer_nickname}
          </Text>
          <Text style={[styles.meta, t.typography.caption, { color: t.colors.subtext }]}>
            {getTimeAgo(order.created_at)}
          </Text>
        </View>
        <FontAwesome5 name="chevron-right" size={14} color={t.colors.muted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    // shadow handled by theme
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // changed from flex-start to align with badge
  },
  canteen: {
    flex: 1,
  },
  badge: {
    // sizing handled inline
  },
  statusText: {
    letterSpacing: 0.5,
  },
  content: {
    // margin handled inline
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    // handled by theme
  },
  value: {
    // handled by theme
  },
  price: {
    // handled by theme
  },
  divider: {
    height: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    // handled by theme
  }
});
