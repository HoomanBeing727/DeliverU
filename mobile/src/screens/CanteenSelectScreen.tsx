import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  } from 'react-native';
  import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../constants/theme';
import AppHeader from '../components/AppHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'CanteenSelect'>;

export default function CanteenSelectScreen({ navigation }: Props) {
  const { user } = useAuth();
  const t = useTheme();


  const canteens = [
    {
      name: 'LG1 Canteen',
      canteen: 'LG1',
      desc: 'Asian Cuisine & More',
      url: 'https://csd.order.place/home/store/102829?mode=prekiosk&_aigens_source=scan&onpremise=true',
    },
    {
      name: 'LSK Canteen',
      canteen: 'LSK',
      desc: 'LSK Chinese & Western',
      url: 'https://now.order.place/#/store/102997/mode/prekiosk',
    },
    {
      name: 'Asia Pacific Catering',
      canteen: 'Asia Pacific',
      desc: 'Asia Pacific Catering',
      url: 'https://now.order.place/#/store/5173439666061312/mode/prekiosk',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <AppHeader title="Select Canteen" onBack={() => navigation.goBack()} />


      <ScrollView contentContainerStyle={styles.content}>
        {canteens.map((c) => (
          <TouchableOpacity
            key={c.canteen}
            style={[styles.card, { backgroundColor: t.colors.card, ...t.shadow.card }]}
            onPress={() => navigation.navigate('CanteenWebView', { canteen: c.canteen, url: c.url })}
            activeOpacity={0.8}
          >
            <View>
              <Text style={[styles.canteenName, { color: t.colors.text }]}>{c.name}</Text>
              <Text style={[styles.canteenDesc, { color: t.colors.subtext }]}>{c.desc}</Text>
            </View>
            <Text style={[styles.arrow, { color: t.colors.subtext }]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
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
    // Shadow applied via t.shadow.card spread in component
    elevation: 2,
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
