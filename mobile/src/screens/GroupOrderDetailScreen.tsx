import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';

import { useTheme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import {
  getGroupOrderDetail,
  closeGroupOrder,
  acceptGroupOrder,
  pickupGroupOrder,
  deliverGroupOrder,
  listJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
} from '../api/groupOrders';
import { RootStackParamList, GroupOrderResponse, Order, GroupOrderJoinRequest } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupOrderDetail'>;

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF9500',
  accepted: '#007AFF',
  picked_up: '#AF52DE',
  delivered: '#34C759',
  cancelled: '#FF3B30',
};

export default function GroupOrderDetailScreen({ navigation, route }: Props) {
  const t = useTheme();
  const { user } = useAuth();
  const { rootOrderId } = route.params;

  const [data, setData] = useState<GroupOrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [joinRequests, setJoinRequests] = useState<GroupOrderJoinRequest[]>([]);

  const loadData = useCallback(async () => {
    try {
      const resp = await getGroupOrderDetail(rootOrderId);
      setData(resp);

      if (resp.root_order.deliverer_id === user?.id && resp.root_order.status === 'accepted') {
        try {
          const requests = await listJoinRequests(rootOrderId);
          setJoinRequests(requests);
        } catch {
          setJoinRequests([]);
        }
      } else {
        setJoinRequests([]);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        Alert.alert('Access Denied', 'You can only view group orders from your own hall.');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to load group order');
      }
    } finally {
      setLoading(false);
    }
  }, [rootOrderId, navigation, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function handleAction(action: () => Promise<unknown>, successMsg: string) {
    setActionLoading(true);
    try {
      await action();
      Alert.alert('Success', successMsg);
      await loadData();
    } catch {
      Alert.alert('Error', 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApprove(requestId: string) {
    setActionLoading(true);
    try {
      await approveJoinRequest(requestId);
      Alert.alert('Approved', 'Join request approved. The requester has been charged 1 credit.');
      await loadData();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        Alert.alert('Cannot Approve', err.response.data.detail);
      } else {
        Alert.alert('Error', 'Failed to approve request.');
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(requestId: string) {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this join request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await rejectJoinRequest(requestId);
              await loadData();
            } catch {
              Alert.alert('Error', 'Failed to reject request.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }

  if (loading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: t.colors.bg }]}>
        <ActivityIndicator size="large" color={t.colors.accent} />
      </View>
    );
  }

  const root = data.root_order;
  const isOwner = user?.id === root.orderer_id;
  const isDeliverer = user?.id === root.deliverer_id;
  const statusColor = STATUS_COLORS[root.status] ?? t.colors.muted;

  function renderParticipant({ item }: { item: Order }) {
    const pColor = STATUS_COLORS[item.status] ?? t.colors.muted;
    return (
      <View style={[styles.participantCard, { backgroundColor: t.colors.card, borderRadius: t.radius.md }, t.shadow.subtle]}>
        <View style={styles.participantRow}>
          <FontAwesome5 name="user" size={14} color={t.colors.accent} />
          <Text style={[t.typography.subhead, styles.participantName, { color: t.colors.text }]}>
            {item.orderer_nickname}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: pColor, borderRadius: t.radius.sm }]}>
            <Text style={[t.typography.caption, styles.statusText]}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>
        {item.note ? (
          <Text style={[t.typography.footnote, { color: t.colors.subtext, marginTop: 4 }]}>
            {item.note}
          </Text>
        ) : null}
      </View>
    );
  }

  function renderJoinRequest({ item }: { item: GroupOrderJoinRequest }) {
    return (
      <View style={[styles.requestCard, { backgroundColor: t.colors.card, borderRadius: t.radius.md }, t.shadow.subtle]}>
        <View style={styles.requestRow}>
          <FontAwesome5 name="user-plus" size={14} color={t.colors.purple} />
          <Text style={[t.typography.subhead, styles.participantName, { color: t.colors.text }]}>
            {item.requester_nickname}
          </Text>
        </View>
        {item.note ? (
          <Text style={[t.typography.footnote, { color: t.colors.subtext, marginTop: 4, marginBottom: 8 }]}>
            {item.note}
          </Text>
        ) : null}
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.requestBtn, { backgroundColor: t.colors.success, borderRadius: t.radius.sm }]}
            onPress={() => handleApprove(item.id)}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="check" size={12} color="#fff" />
            <Text style={[t.typography.caption, styles.requestBtnText]}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.requestBtn, { backgroundColor: t.colors.danger, borderRadius: t.radius.sm }]}
            onPress={() => handleReject(item.id)}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="times" size={12} color="#fff" />
            <Text style={[t.typography.caption, styles.requestBtnText]}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const listData: Array<{ type: 'header' } | { type: 'participant'; data: Order } | { type: 'requests_header' } | { type: 'request'; data: GroupOrderJoinRequest } | { type: 'footer' }> = [];

  listData.push({ type: 'header' });
  data.participants.forEach(p => listData.push({ type: 'participant', data: p }));
  if (isDeliverer && joinRequests.length > 0) {
    listData.push({ type: 'requests_header' });
    joinRequests.forEach(r => listData.push({ type: 'request', data: r }));
  }
  listData.push({ type: 'footer' });

  return (
    <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <AppHeader title="Group Order" onBack={() => navigation.goBack()} />

      <FlatList
        data={listData}
        keyExtractor={(item, index) => {
          if (item.type === 'participant') return `p-${item.data.id}`;
          if (item.type === 'request') return `r-${item.data.id}`;
          return `${item.type}-${index}`;
        }}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.headerSection}>
                <View style={[styles.infoCard, { backgroundColor: t.colors.card, borderRadius: t.radius.lg }, t.shadow.card]}>
                  <View style={styles.infoRow}>
                    <FontAwesome5 name="store" size={18} color={t.colors.accent} />
                    <Text style={[t.typography.title3, styles.infoValue, { color: t.colors.text }]}>{root.canteen}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <FontAwesome5 name="building" size={16} color={t.colors.subtext} />
                    <Text style={[t.typography.body, styles.infoValue, { color: t.colors.subtext }]}>{root.delivery_hall}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <FontAwesome5 name="user" size={16} color={t.colors.subtext} />
                    <Text style={[t.typography.body, styles.infoValue, { color: t.colors.subtext }]}>{root.orderer_nickname}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor, borderRadius: t.radius.sm }]}>
                      <Text style={[t.typography.caption, styles.statusText]}>{root.status.replace('_', ' ')}</Text>
                    </View>
                    {data.is_open && (
                      <View style={[styles.statusBadge, { backgroundColor: t.colors.success, borderRadius: t.radius.sm, marginLeft: 8 }]}>
                        <Text style={[t.typography.caption, styles.statusText]}>Open</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text style={[t.typography.headline, styles.sectionTitle, { color: t.colors.text }]}>
                  Participants ({data.total_participants})
                </Text>
              </View>
            );
          }

          if (item.type === 'participant') {
            return renderParticipant({ item: item.data });
          }

          if (item.type === 'requests_header') {
            return (
              <View style={styles.requestsHeaderSection}>
                <Text style={[t.typography.headline, styles.sectionTitle, { color: t.colors.text }]}>
                  Join Requests ({joinRequests.length})
                </Text>
              </View>
            );
          }

          if (item.type === 'request') {
            return renderJoinRequest({ item: item.data });
          }

          if (item.type === 'footer') {
            return (
              <View style={styles.actions}>
                {isOwner && data.is_open && root.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: t.colors.warning, borderRadius: t.radius.pill }]}
                    onPress={() => handleAction(() => closeGroupOrder(rootOrderId), 'Group closed')}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={[t.typography.headline, styles.actionText]}>Close Group</Text>
                  </TouchableOpacity>
                )}

                {!isOwner && !isDeliverer && data.is_open && root.status === 'accepted' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: t.colors.accent, borderRadius: t.radius.pill }]}
                    onPress={() => navigation.navigate('GroupOrderJoin', { rootOrderId })}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={[t.typography.headline, styles.actionText]}>Request to Join</Text>
                  </TouchableOpacity>
                )}

                {!isOwner && !isDeliverer && root.status === 'pending' && root.orderer_id !== user?.id && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: t.colors.teal, borderRadius: t.radius.pill }]}
                    onPress={() => handleAction(() => acceptGroupOrder(rootOrderId), 'Batch accepted!')}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={[t.typography.headline, styles.actionText]}>Accept Delivery</Text>
                  </TouchableOpacity>
                )}

                {isDeliverer && root.status === 'accepted' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: t.colors.purple, borderRadius: t.radius.pill }]}
                    onPress={() => handleAction(() => pickupGroupOrder(rootOrderId), 'Picked up!')}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={[t.typography.headline, styles.actionText]}>Pick Up All</Text>
                  </TouchableOpacity>
                )}

                {isDeliverer && root.status === 'picked_up' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: t.colors.success, borderRadius: t.radius.pill }]}
                    onPress={() => handleAction(() => deliverGroupOrder(rootOrderId), 'All delivered!')}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={[t.typography.headline, styles.actionText]}>Deliver All</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }

          return null;
        }}
        contentContainerStyle={styles.listContent}
      />
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
  listContent: {
    padding: 16,
  },
  headerSection: {
    marginBottom: 8,
  },
  infoCard: {
    padding: 20,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoValue: {
    marginLeft: 12,
  },
  sectionTitle: {
    marginBottom: 12,
    marginLeft: 4,
  },
  participantCard: {
    padding: 14,
    marginBottom: 10,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantName: {
    flex: 1,
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    color: '#fff',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  requestsHeaderSection: {
    marginTop: 16,
    marginBottom: 4,
  },
  requestCard: {
    padding: 14,
    marginBottom: 10,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  requestBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  actions: {
    marginTop: 16,
    gap: 12,
    paddingBottom: 32,
  },
  actionBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
  },
});
