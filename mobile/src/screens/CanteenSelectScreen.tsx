import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CanteenSelect'>;

export default function CanteenSelectScreen({ navigation }: Props) {
  const { user } = useAuth();
  const isDark = user?.dark_mode ?? false;

  const colors = isDark
    ? { bg: '#1a1a2e', card: '#16213e', text: '#eee', sub: '#aaa', accent: '#0f3460' }
    : { bg: '#f5f5f5', card: '#fff', text: '#333', sub: '#666', accent: '#003366' };

  const handleCanteenSelect = () => {
    navigation.navigate('CanteenWebView', {
      canteen: 'LG1',
      url: 'https://csd.order.place/home/store/102829?mode=prekiosk&_aigens_source=scan&onpremise=true',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={[styles.backButtonText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Select Canteen</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={handleCanteenSelect}
          activeOpacity={0.8}
        >
          <View>
            <Text style={[styles.canteenName, { color: colors.text }]}>LG1 Canteen</Text>
            <Text style={[styles.canteenDesc, { color: colors.sub }]}>Asian Cuisine & More</Text>
          </View>
          <Text style={[styles.arrow, { color: colors.sub }]}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 60,
    // paddingTop handled by SafeAreaView
  },
  backButton: {
    padding: 10,
    marginLeft: -10,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40, 
  },
  content: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  canteenName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  canteenDesc: {
    fontSize: 14,
  },
  arrow: {
    fontSize: 24,
    fontWeight: '300',
  },
});
