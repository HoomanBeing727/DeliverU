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

import { useAuth } from '../context/AuthContext';
import { setupProfile } from '../api/users';
import ChipSelector from '../components/ChipSelector';
import RadioGroup from '../components/RadioGroup';
import {
  HKUST_HALLS,
  TIME_SLOTS,
  TAKE_ORDER_LOCATIONS,
  DELIVERY_HABITS,
} from '../constants/dorms';

export default function ProfileSetupScreen() {
  const { refreshUser } = useAuth();

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Set Up Your Profile</Text>
      <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

      <Text style={styles.label}>Nickname</Text>
      <TextInput
        style={styles.input}
        placeholder="Your display name"
        placeholderTextColor="#999"
        value={nickname}
        onChangeText={setNickname}
      />

      <ChipSelector
        label="Dorm Hall"
        options={HKUST_HALLS}
        selected={dormHall ? [dormHall] : []}
        onToggle={selectDormHall}
        multiple={false}
      />

      <ChipSelector
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

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>I also want to deliver</Text>
        <Switch
          value={isDeliverer}
          onValueChange={setIsDeliverer}
          trackColor={{ false: '#ccc', true: '#003366' }}
          thumbColor="#fff"
        />
      </View>

      {isDeliverer && (
        <>
          <ChipSelector
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

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Complete Setup'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#003366',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  button: {
    backgroundColor: '#003366',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
