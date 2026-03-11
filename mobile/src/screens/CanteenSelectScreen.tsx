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
            style={[
              styles.card,
              { 
                backgroundColor: t.colors.card, 
                borderRadius: t.radius.lg,
                ...t.shadow.card 
              }
            ]}
            onPress={() => navigation.navigate('CanteenWebView', { canteen: c.canteen, url: c.url })}
            activeOpacity={0.8}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.iconContainer, { backgroundColor: t.colors.secondaryBg }]}>
                <FontAwesome5 name="store" size={20} color={t.colors.accent} />
              </View>
              <View>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  canteenName: {
    marginBottom: 4,
  },
  canteenDesc: {
    // Handled by theme typography
  },
});
