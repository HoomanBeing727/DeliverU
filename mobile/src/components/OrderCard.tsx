import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Order } from '../types';
import { useTheme } from '../constants/theme';
import { formatPriceHK } from '../utils/formatPrice';
import { pluralize } from '../utils/pluralize';

interface Props {
  order: Order;
  onPress: () => void;
  variant?: 'default' | 'deliverer';
}

function getTimeAgo(dateString: string) {
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
}

export default function OrderCard({ order, onPress, variant = 'default' }: Props) {
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

  const statusColor = getStatusColor(order.status);

  if (variant === 'deliverer') {
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
          t.shadow.card,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.header, { marginBottom: t.spacing.sm }]}>
          <View style={styles.delivererTitleRow}>
            <FontAwesome5 name="map-marker-alt" size={16} color={t.colors.accent} style={{ marginRight: 8 }} />
            <Text style={[t.typography.title3, { color: t.colors.text, flex: 1 }]} numberOfLines={1}>
              {order.delivery_hall}
            </Text>
          </View>
          <View style={[styles.earnBadge, { backgroundColor: t.colors.goldLight, borderRadius: t.radius.pill }]}>
            <FontAwesome5 name="coins" size={10} color={t.colors.gold} style={{ marginRight: 4 }} />
            <Text style={[t.typography.caption2, { color: t.colors.gold, fontWeight: '700' }]}>+1 Credit</Text>
          </View>
        </View>

        <View style={[styles.delivererInfoRow, { marginBottom: t.spacing.sm }]}>
          <View style={[styles.infoPill, { backgroundColor: t.colors.accentLight, borderRadius: t.radius.sm }]}>
            <FontAwesome5 name="store" size={10} color={t.colors.accent} style={{ marginRight: 4 }} />
            <Text style={[t.typography.caption, { color: t.colors.accent }]}>{order.canteen}</Text>
          </View>
          <View style={[styles.infoPill, { backgroundColor: t.colors.bg, borderRadius: t.radius.sm }]}>
            <Text style={[t.typography.caption, { color: t.colors.subtext }]}>
              {pluralize(itemCount, 'item')} · {formatPriceHK(order.total_price)}
            </Text>
          </View>
          {order.is_group_open && (
            <View style={[styles.infoPill, { backgroundColor: t.colors.purple + '18', borderRadius: t.radius.sm }]}>
              <FontAwesome5 name="users" size={10} color={t.colors.purple} style={{ marginRight: 4 }} />
              <Text style={[t.typography.caption, { color: t.colors.purple }]}>
                {order.participant_count + 1}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={[t.typography.caption, { color: t.colors.subtext }]}>
            {order.orderer_nickname} · {getTimeAgo(order.created_at)}
          </Text>
          <FontAwesome5 name="chevron-right" size={14} color={t.colors.muted} />
        </View>
      </TouchableOpacity>
    );
  }

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
        <View style={[styles.badge, { backgroundColor: statusColor + '18', borderRadius: t.radius.pill, paddingHorizontal: 12, paddingVertical: 4 }]}> 
          <View style={[styles.badgeDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, t.typography.caption2, { color: statusColor, fontWeight: '700' }]}>
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
            {pluralize(itemCount, 'item')}
          </Text>
        </View>
        
        <View style={[styles.row, { marginBottom: t.spacing.xs }]}>
          <View style={styles.iconLabel}>
            <FontAwesome5 name="dollar-sign" size={13} color={t.colors.accent} style={{ width: 20 }} />
            <Text style={[styles.label, t.typography.body, { color: t.colors.subtext }]}>Total</Text>
          </View>
          <Text style={[styles.price, t.typography.headline, { color: t.colors.accent }]}>
            {formatPriceHK(order.total_price)}
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

        {order.is_group_open && (
          <View style={[styles.row, { marginBottom: t.spacing.xs }]}>
            <View style={styles.iconLabel}>
              <FontAwesome5 name="users" size={13} color={t.colors.purple} style={{ width: 20 }} />
              <Text style={[styles.label, t.typography.body, { color: t.colors.subtext }]}>Group</Text>
            </View>
            <Text style={[styles.value, t.typography.subhead, { color: t.colors.purple }]}>
              {pluralize(order.participant_count + 1, 'participant')}
            </Text>
          </View>
        )}
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
    alignItems: 'center',
  },
  canteen: {
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
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
  },
  delivererTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  earnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  delivererInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
