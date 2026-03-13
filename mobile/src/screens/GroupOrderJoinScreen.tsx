import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
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
import AppHeader from '../components/AppHeader';
import { getGroupOrderDetail, createJoinRequest, cancelJoinRequest } from '../api/groupOrders';
import { RootStackParamList, GroupOrderResponse } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupOrderJoin'>;

export default function GroupOrderJoinScreen({ navigation, route }: Props) {
  const t = useTheme();
  const { rootOrderId } = route.params;

  const [data, setData] = useState<GroupOrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');

  const loadData = useCallback(() => {
    setLoading(true);
    getGroupOrderDetail(rootOrderId)
      .then(setData)
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          Alert.alert('Access Denied', 'You can only view group orders from your own hall.');
          navigation.goBack();
        } else {
          Alert.alert('Error', 'Failed to load group order');
        }
      })
      .finally(() => setLoading(false));
  }, [rootOrderId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function handleRequestJoin() {
    setSubmitting(true);
    try {
      await createJoinRequest(rootOrderId, note.trim() || null);
      Alert.alert(
        'Request Sent',
        'Waiting for deliverer approval. You will be charged 1 credit if approved.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail || '';
        if (status === 400 && detail.toLowerCase().includes('accepted')) {
          Alert.alert('Not Available', 'You can request to join only after a deliverer accepts this group order.');
        } else if (status === 400 || status === 409) {
          Alert.alert('Cannot Join', detail || 'Group is closed to new join requests.');
        } else if (status === 403) {
          Alert.alert('Access Denied', detail || 'You cannot join this group order.');
        } else {
          Alert.alert('Error', detail || 'Failed to send request.');
        }
      } else {
        Alert.alert('Error', 'Failed to send request. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelRequest() {
    if (!data?.my_join_request) return;
    setSubmitting(true);
    try {
      await cancelJoinRequest(data.my_join_request.id);
      Alert.alert('Cancelled', 'Your join request has been cancelled.');
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to cancel request.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: t.colors.bg }]}>
        <ActivityIndicator size="large" color={t.colors.accent} />
      </View>
    );
  }

  const root = data.root_order;
  const myRequest = data.my_join_request;
  const canRequest = !myRequest || myRequest.status === 'cancelled';
  const isPending = myRequest?.status === 'pending';
  const isRejected = myRequest?.status === 'rejected';
  const isApproved = myRequest?.status === 'approved';

  return (
    <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <AppHeader title="Request to Join" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <View style={[styles.summaryCard, { backgroundColor: t.colors.card, borderRadius: t.radius.lg }, t.shadow.card]}>
          <View style={styles.row}>
            <FontAwesome5 name="store" size={16} color={t.colors.accent} />
            <Text style={[t.typography.headline, styles.rowText, { color: t.colors.text }]}>{root.canteen}</Text>
          </View>
          <View style={styles.row}>
            <FontAwesome5 name="building" size={14} color={t.colors.subtext} />
            <Text style={[t.typography.callout, styles.rowText, { color: t.colors.subtext }]}>{root.delivery_hall}</Text>
          </View>
          <View style={styles.row}>
            <FontAwesome5 name="user" size={14} color={t.colors.subtext} />
            <Text style={[t.typography.callout, styles.rowText, { color: t.colors.subtext }]}>{root.orderer_nickname}</Text>
          </View>
          <View style={styles.row}>
            <FontAwesome5 name="users" size={14} color={t.colors.teal} />
            <Text style={[t.typography.callout, styles.rowText, { color: t.colors.teal }]}>
              {data.total_participants} participant{data.total_participants !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {isPending && (
          <View style={[styles.statusCard, { backgroundColor: t.colors.statusPending + '20', borderRadius: t.radius.md }]}>
            <FontAwesome5 name="clock" size={16} color={t.colors.statusPending} />
            <View style={styles.statusTextBlock}>
              <Text style={[t.typography.headline, { color: t.colors.statusPending }]}>Request Pending</Text>
              <Text style={[t.typography.footnote, { color: t.colors.subtext }]}>
                Waiting for deliverer approval
              </Text>
            </View>
          </View>
        )}

        {isRejected && (
          <View style={[styles.statusCard, { backgroundColor: t.colors.danger + '20', borderRadius: t.radius.md }]}>
            <FontAwesome5 name="times-circle" size={16} color={t.colors.danger} />
            <View style={styles.statusTextBlock}>
              <Text style={[t.typography.headline, { color: t.colors.danger }]}>Request Rejected</Text>
              {myRequest?.decision_reason && (
                <Text style={[t.typography.footnote, { color: t.colors.subtext }]}>
                  Reason: {myRequest.decision_reason}
                </Text>
              )}
            </View>
          </View>
        )}

        {isApproved && (
          <View style={[styles.statusCard, { backgroundColor: t.colors.success + '20', borderRadius: t.radius.md }]}>
            <FontAwesome5 name="check-circle" size={16} color={t.colors.success} />
            <View style={styles.statusTextBlock}>
              <Text style={[t.typography.headline, { color: t.colors.success }]}>Request Approved</Text>
              <Text style={[t.typography.footnote, { color: t.colors.subtext }]}>
                You have joined the group order
              </Text>
            </View>
          </View>
        )}

        {canRequest && (
          <>
            <Text style={[t.typography.subhead, styles.label, { color: t.colors.text }]}>
              Note (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: t.colors.card,
                  color: t.colors.text,
                  borderColor: t.colors.border,
                  borderRadius: t.radius.md,
                },
              ]}
              placeholder="e.g. Please get me a milk tea"
              placeholderTextColor={t.colors.muted}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={200}
            />

            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: submitting ? t.colors.muted : t.colors.accent,
                  borderRadius: t.radius.pill,
                },
                t.shadow.floating,
              ]}
              onPress={handleRequestJoin}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Text style={[t.typography.headline, { color: '#fff' }]}>
                {submitting ? 'Sending...' : 'Request to Join'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {isPending && (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: 'transparent',
                borderColor: t.colors.danger,
                borderWidth: 1,
                borderRadius: t.radius.pill,
              },
            ]}
            onPress={handleCancelRequest}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={[t.typography.headline, { color: t.colors.danger }]}>
              {submitting ? 'Cancelling...' : 'Cancel Request'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    padding: 20,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowText: {
    marginLeft: 12,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 20,
  },
  statusTextBlock: {
    marginLeft: 12,
    flex: 1,
  },
  label: {
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    padding: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 24,
    fontSize: 16,
  },
  actionBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
});
