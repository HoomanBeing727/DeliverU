import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getLeaderboard } from '../api/stats';
import { useTheme } from '../constants/theme';
import AppHeader from '../components/AppHeader';
import { LeaderboardResponse, RootStackParamList } from '../types';

type LeaderboardTab = 'orderers' | 'deliverers';

type LeaderboardRouteParams = { initialTab?: LeaderboardTab } | undefined;

type LeaderboardStackParamList = RootStackParamList & { Leaderboard: LeaderboardRouteParams };

type Props = NativeStackScreenProps<LeaderboardStackParamList, 'Leaderboard'>;

export default function LeaderboardScreen({ navigation, route }: Props) {
  const t = useTheme();
  const initialTab: LeaderboardTab = route.params?.initialTab ?? 'orderers';
  const [activeTab, setActiveTab] = useState<LeaderboardTab>(initialTab);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (route.params?.initialTab) setActiveTab(route.params.initialTab);
  }, [route.params?.initialTab]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      (async () => {
        try {
          setLoading(true);
          const next = await getLeaderboard();
          if (isActive) setData(next);
        } catch {
          Alert.alert('Error', 'Failed to load leaderboard');
        } finally {
          if (isActive) setLoading(false);
        }
      })();

      return () => {
        isActive = false;
      };
    }, []),
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: t.colors.bg }]}>
        <ActivityIndicator size="large" color={t.colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <AppHeader title="Leaderboard" onBack={navigation.goBack} />
      <ScrollView style={styles.container}>

      <View style={[styles.toggleContainer, { backgroundColor: t.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            activeTab === 'orderers' && { backgroundColor: t.colors.accent },
          ]}
          onPress={() => setActiveTab('orderers')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, { color: activeTab === 'orderers' ? '#fff' : t.colors.text }]}>
            Orderers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            activeTab === 'deliverers' && { backgroundColor: t.colors.accent },
          ]}
          onPress={() => setActiveTab('deliverers')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, { color: activeTab === 'deliverers' ? '#fff' : t.colors.text }]}>
            Deliverers
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: t.colors.card }, t.shadow.card]}>
        <Text style={[t.typography.title2, { color: t.colors.text, marginBottom: t.spacing.sm }]}>
          {activeTab === 'orderers' ? 'Top Orderers' : 'Top Deliverers'}
        </Text>

        {activeTab === 'orderers'
          ? (data?.top_orderers && data.top_orderers.length > 0
              ? data.top_orderers.map((entry, index) => (
                  <View key={entry.user_id} style={styles.entryRow}>
                    <Text style={[styles.leftText, { color: t.colors.text }]}>
                      {index + 1}. {entry.nickname}
                    </Text>
                    <View style={styles.rightColumn}>
                      <Text style={[styles.rightPrimary, { color: t.colors.text }]}>
                        {Math.floor(entry.total_orders ?? entry.value)}
                      </Text>
                      <Text style={[styles.rightSecondary, { color: t.colors.subtext }]}>orders</Text>
                    </View>
                  </View>
                ))
              : <Text style={[styles.emptyText, { color: t.colors.subtext }]}>No data yet</Text>
            )
          : (data?.top_deliverers && data.top_deliverers.length > 0
              ? data.top_deliverers.map((entry, index) => (
                  <View key={entry.user_id} style={styles.entryRow}>
                    <Text style={[styles.leftText, { color: t.colors.text }]}>
                      {index + 1}. {entry.nickname}
                    </Text>
                    <View style={styles.rightColumn}>
                      <Text style={[styles.rightPrimary, { color: t.colors.text }]}>
                        {entry.value.toFixed(1)} ★
                      </Text>
                      <Text style={[styles.rightSecondary, { color: t.colors.subtext }]}>
                        {entry.total_ratings ?? 0} ratings
                      </Text>
                    </View>
                  </View>
                ))
              : <Text style={[styles.emptyText, { color: t.colors.subtext }]}>No data yet</Text>
            )}
      </View>
    </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 25,
    padding: 4,
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  leftText: {
    flex: 1,
    paddingRight: 16,
  },
  rightColumn: {
    alignItems: 'flex-end',
  },
  rightPrimary: {
    fontWeight: '600',
  },
  rightSecondary: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
