import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../constants/theme';
import { setupProfile } from '../api/users';
import ChipSelector from '../components/ChipSelector';
import DropdownPicker from '../components/DropdownPicker';
import HorizontalChipSelector from '../components/HorizontalChipSelector';
import RadioGroup from '../components/RadioGroup';
import {
  HKUST_HALLS,
  TIME_SLOTS,
  TAKE_ORDER_LOCATIONS,
  DELIVERY_HABITS,
} from '../constants/dorms';

export default function ProfileSetupScreen() {
  const { refreshUser } = useAuth();
  const t = useTheme();
  const [nickname, setNickname] = useState('');
  const [dormHall, setDormHall] = useState('');
  const [orderTimes, setOrderTimes] = useState<string[]>([]);
  const [takeOrderLocation, setTakeOrderLocation] = useState('');
  const [deliveryHabit, setDeliveryHabit] = useState('');

  const [isDeliverer, setIsDeliverer] = useState(false);
  const [returnTimes, setReturnTimes] = useState<string[]>([]);
  const [deliveryHalls, setDeliveryHalls] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

  function toggleOrderTime(time: string) {
    setOrderTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  }

  function toggleReturnTime(time: string) {
    setReturnTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  }

  function toggleDeliveryHall(hall: string) {
    setDeliveryHalls((prev) =>
      prev.includes(hall) ? prev.filter((h) => h !== hall) : [...prev, hall]
    );
  }

  function selectDormHall(hall: string) {
    setDormHall(hall);
  }

  async function handleSubmit() {
    if (!nickname.trim()) {
      Alert.alert('Error', 'Please enter a nickname');
      return;
    }
    if (nickname.trim().length < 2 || nickname.trim().length > 20) {
      Alert.alert('Error', 'Nickname must be 2–20 characters');
      return;
    }
    if (/\s/.test(nickname)) {
      Alert.alert('Error', 'Nickname cannot contain spaces');
      return;
    }
    if (!dormHall) {
      Alert.alert('Error', 'Please select your dorm hall');
      return;
    }
    if (orderTimes.length === 0) {
      Alert.alert('Error', 'Please select at least one order time');
      return;
    }
    if (!takeOrderLocation) {
      Alert.alert('Error', 'Please select where you take orders');
      return;
    }
    if (!deliveryHabit) {
      Alert.alert('Error', 'Please select your delivery preference');
      return;
    }

    if (isDeliverer) {
      if (returnTimes.length === 0) {
        Alert.alert('Error', 'Deliverers must select available return times');
        return;
      }
      if (deliveryHalls.length === 0) {
        Alert.alert('Error', 'Deliverers must select preferred delivery halls');
        return;
      }
    }

    setLoading(true);
    try {
      await setupProfile({
        nickname: nickname.trim(),
        dorm_hall: dormHall,
        order_times: orderTimes,
        pref_take_order_location: takeOrderLocation,
        pref_delivery_habit: deliveryHabit,
        is_deliverer: isDeliverer,
        available_return_times: isDeliverer ? returnTimes : undefined,
        preferred_delivery_halls: isDeliverer ? deliveryHalls : undefined,
      });
      await refreshUser();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { detail: string } } }).response.data.detail
          : 'Profile setup failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.colors.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, t.typography.title1, { color: t.colors.accent }]}>Set Up Your Profile</Text>
      <Text style={[styles.subtitle, t.typography.footnote, { color: t.colors.subtext }]}>Tell us a bit about yourself</Text>

      <View style={[styles.section, { backgroundColor: t.colors.card, borderRadius: t.radius.lg }, t.shadow.card]}>
        <Text style={[t.typography.headline, { color: t.colors.text, marginBottom: t.spacing.md }]}>
          Basic Info
        </Text>

        <View style={styles.labelRow}>
          <FontAwesome5 name="user" size={14} color={t.colors.accent} style={{ marginRight: 8 }} />
          <Text style={[styles.label, t.typography.subhead, { color: t.colors.text }]}>Nickname</Text>
        </View>
        
        <View style={[
          styles.inputContainer, 
          { 
            borderRadius: t.radius.md, 
            backgroundColor: t.colors.secondaryBg,
            borderWidth: 1,
            borderColor: t.colors.separator
          }
        ]}>
          <TextInput
            style={[styles.input, { 
              color: t.colors.text, 
              backgroundColor: 'transparent'
            }]}
            placeholder="Your display name"
            placeholderTextColor={t.colors.subtext}
            value={nickname}
            onChangeText={setNickname}
          />
        </View>

        <DropdownPicker
          label="Dorm Hall"
          options={HKUST_HALLS}
          selected={dormHall}
          onSelect={selectDormHall}
          placeholder="Select your dorm hall"
        />
      </View>

      <View style={[styles.section, { backgroundColor: t.colors.card, borderRadius: t.radius.lg }, t.shadow.card]}>
        <Text style={[t.typography.headline, { color: t.colors.text, marginBottom: t.spacing.md }]}>
          Ordering Preferences
        </Text>

        <HorizontalChipSelector
          label="Usually Order At"
          options={TIME_SLOTS}
          selected={orderTimes}
          onToggle={toggleOrderTime}
        />

        <RadioGroup
          label="Where do you take orders?"
          options={TAKE_ORDER_LOCATIONS}
          selected={takeOrderLocation}
          onSelect={setTakeOrderLocation}
        />

        <RadioGroup
          label="Delivery Preference"
          options={DELIVERY_HABITS}
          selected={deliveryHabit}
          onSelect={setDeliveryHabit}
        />
      </View>

      <View style={[styles.section, { backgroundColor: t.colors.card, borderRadius: t.radius.lg }, t.shadow.card]}>
        <Text style={[t.typography.headline, { color: t.colors.text, marginBottom: t.spacing.md }]}>
          Deliverer Settings
        </Text>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, t.typography.subhead, { color: t.colors.text }]}>I also want to deliver</Text>
          <Switch
            value={isDeliverer}
            onValueChange={setIsDeliverer}
            trackColor={{ false: t.colors.secondaryBg, true: t.colors.accent }}
            thumbColor="#fff"
          />
        </View>

        {isDeliverer && (
          <>
            <HorizontalChipSelector
              label="Available Return Times"
              options={TIME_SLOTS}
              selected={returnTimes}
              onToggle={toggleReturnTime}
            />

            <ChipSelector
              label="Preferred Delivery Halls"
              options={HKUST_HALLS}
              selected={deliveryHalls}
              onToggle={toggleDeliveryHall}
            />
          </>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: t.colors.accent, borderRadius: t.radius.md }, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <FontAwesome5 name="check-circle" size={16} color="#fff" style={{ marginRight: 8 }} />
        <Text style={[styles.buttonText, t.typography.callout, { color: '#fff' }]}>{loading ? 'Saving...' : 'Complete Setup'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
    gap: 20,
  },
  section: {
    padding: 20,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    // typography handled in inline style
  },
  inputContainer: {
    marginBottom: 20,
    // borderRadius handled in inline
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    // height: 50, // Optional but good for touch targets
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  switchLabel: {
    // typography handled in inline style
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: '600',
  },
});
