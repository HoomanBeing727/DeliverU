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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

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
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  
  const isDark = user?.dark_mode ?? false;
  const colors = isDark 
    ? { background: '#1a1a2e', card: '#16213e', text: '#e0e0e0', inputBg: '#2a2a40', border: '#333' } 
    : { background: '#f0f4f8', card: '#ffffff', text: '#1a1a2e', inputBg: '#ffffff', border: '#ddd' };

  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [dormHall, setDormHall] = useState(user?.dorm_hall ?? '');
  const [orderTimes, setOrderTimes] = useState<string[]>(user?.order_times ?? []);
  const [takeOrderLocation, setTakeOrderLocation] = useState(user?.pref_take_order_location ?? '');
  const [deliveryHabit, setDeliveryHabit] = useState(user?.pref_delivery_habit ?? '');

  const [isDeliverer, setIsDeliverer] = useState(user?.is_deliverer ?? false);
  const [returnTimes, setReturnTimes] = useState<string[]>(user?.available_return_times ?? []);
  const [deliveryHalls, setDeliveryHalls] = useState<string[]>(user?.preferred_delivery_halls ?? []);

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
      navigation.goBack();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { detail: string } } }).response.data.detail
          : 'Failed to update profile. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.text }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.label, { color: colors.text }]}>Nickname</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
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
            <Text style={[styles.switchLabel, { color: colors.text }]}>I also want to deliver</Text>
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
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
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
  },
  button: {
    backgroundColor: '#003366',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  keyboardView: {
    flex: 1,
  },
});
