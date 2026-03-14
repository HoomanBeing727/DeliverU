import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome5 } from '@expo/vector-icons';
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
      icon: 'bowl-rice' as const,
      color: t.colors.orange,
      url: 'https://csd.order.place/home/store/102829?mode=prekiosk&_aigens_source=scan&onpremise=true',
    },
    {
      name: 'LSK Canteen',
      canteen: 'LSK',
      desc: 'LSK Chinese & Western',
      icon: 'utensils' as const,
      color: t.colors.accent,
      url: 'https://now.order.place/#/store/102997/mode/prekiosk',
    },
    {
      name: 'Asia Pacific Catering',
      canteen: 'Asia Pacific',
      desc: 'Asia Pacific Catering',
      icon: 'globe-asia' as const,
      color: t.colors.teal,
      url: 'https://now.order.place/#/store/5173439666061312/mode/prekiosk',
    },
    {
      name: 'Oliver Super Sandwich',
      canteen: 'Oliver Super Sandwich',
      desc: 'Sandwiches & Light Bites',
      icon: 'bread-slice' as const,
      color: t.colors.gold,
      url: 'https://oss.order.place/home/store/4914477236486144',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <AppHeader title="Select Canteen" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        {canteens.map((c) => (
          <TouchableOpacity
            key={c.canteen}
            style={[
              styles.card,
              { 
                backgroundColor: t.colors.card, 
                borderRadius: t.radius.lg,
              },
              t.shadow.card,
            ]}
            onPress={() => navigation.navigate('CanteenWebView', { canteen: c.canteen, url: c.url })}
            activeOpacity={0.8}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.iconContainer, { backgroundColor: c.color + '18' }]}>
                <FontAwesome5 name={c.icon} size={20} color={c.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.canteenName, t.typography.headline, { color: t.colors.text }]}>{c.name}</Text>
                <Text style={[styles.canteenDesc, t.typography.footnote, { color: t.colors.subtext }]}>{c.desc}</Text>
              </View>
            </View>
            <FontAwesome5 name="chevron-right" size={14} color={t.colors.subtext} />
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
  content: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardText: {
    flex: 1,
  },
  canteenName: {
    marginBottom: 4,
  },
  canteenDesc: {
    // Handled by theme typography
  },
});
