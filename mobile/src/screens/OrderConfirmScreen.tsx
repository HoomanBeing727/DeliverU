import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { createOrder, CreateOrderPayload } from '../api/orders';
import { RootStackParamList, OrderItem } from '../types';
import { HKUST_HALLS } from '../constants/dorms';
import { useTheme } from '../constants/theme';
import AppHeader from '../components/AppHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderConfirm'>;

export default function OrderConfirmScreen({ navigation, route }: Props) {
  const { canteen, qrCodeImage, qrCodeData, totalPrice: passedPrice, items: passedItems } = route.params;
  const { user } = useAuth();
  const t = useTheme();

  const [items, setItems] = useState<OrderItem[]>(
    passedItems && passedItems.length > 0 ? passedItems : []
  );
  const [deliveryHall, setDeliveryHall] = useState<string>(user?.dorm_hall ?? 'Hall I');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const totalPrice = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  function updateItem(index: number, field: keyof OrderItem, value: string | number) {
    const newItems = [...items];
    if (field === 'qty' || field === 'price') {
      const numVal = parseFloat(value as string) || 0;
      newItems[index] = { ...newItems[index], [field]: numVal };
    } else {
      newItems[index] = { ...newItems[index], [field]: value as string };
    }
    setItems(newItems);
  }

  function removeItem(index: number) {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  }

  function addItem() {
    setItems([...items, { name: '', qty: 1, price: 0 }]);
  }

  async function handleSubmit() {
    const validItems = items.filter(i => i.name.trim() !== '');
    if (validItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    if (totalPrice <= 0) {
      Alert.alert('Error', 'Total price must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateOrderPayload = {
        canteen,
        items: validItems,
        total_price: totalPrice,
        delivery_hall: deliveryHall,
        note: note.trim() || null,
        qr_code_image: qrCodeImage,
        qr_code_data: qrCodeData,
      };
      await createOrder(payload);
      Alert.alert('Success', 'Order placed successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
      ]);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { detail: string } } }).response.data.detail
        : 'Failed to place order';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: t.colors.bg }]}>
      <AppHeader title="Confirm Order" onBack={navigation.goBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Canteen Section */}
        <View style={[styles.section, { backgroundColor: t.colors.card, borderRadius: t.radius.md, ...t.shadow.card }]}>
          <Text style={[styles.sectionTitle, t.typography.caption, { color: t.colors.subtext }]}>Canteen</Text>
          <Text style={[styles.canteenName, t.typography.headline, { color: t.colors.text }]}>{canteen}</Text>
        </View>

        {/* Order Items Section */}
        <View style={[styles.section, { backgroundColor: t.colors.card, borderRadius: t.radius.md, ...t.shadow.card }]}>
          <Text style={[styles.sectionTitle, t.typography.caption, { color: t.colors.subtext }]}>Order Items</Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <TextInput
                style={[styles.input, { flex: 2, backgroundColor: t.colors.bg, color: t.colors.text, borderColor: t.colors.border }]}
                placeholder="Item Name"
                placeholderTextColor={t.colors.subtext}
                value={item.name}
                onChangeText={(text) => updateItem(index, 'name', text)}
              />
              <TextInput
                style={[styles.input, { flex: 0.5, backgroundColor: t.colors.bg, color: t.colors.text, borderColor: t.colors.border }]}
                placeholder="Qty"
                placeholderTextColor={t.colors.subtext}
                keyboardType="numeric"
                value={item.qty.toString()}
                onChangeText={(text) => updateItem(index, 'qty', text)}
              />
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: t.colors.bg, color: t.colors.text, borderColor: t.colors.border }]}
                placeholder="Price"
                placeholderTextColor={t.colors.subtext}
                keyboardType="numeric"
                value={item.price.toString()}
                onChangeText={(text) => updateItem(index, 'price', text)}
              />
              <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn}>
                <FontAwesome5 name="times-circle" size={18} color={t.colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={addItem} style={styles.addItemBtn}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome5 name="plus-circle" size={14} color={t.colors.accent} style={{ marginRight: 6 }} />
              <Text style={{ color: t.colors.accent, fontWeight: 'bold' }}>Add Item</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Total Price Section */}
        <View style={[styles.section, { backgroundColor: t.colors.card, borderRadius: t.radius.md, ...t.shadow.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[styles.sectionTitle, t.typography.caption, { color: t.colors.subtext, marginBottom: 0 }]}>Total Price</Text>
          <Text style={[styles.totalPrice, t.typography.title2, { color: t.colors.accent }]}>${totalPrice.toFixed(1)}</Text>
        </View>

        {/* Delivery Hall Section */}
        <View style={[styles.section, { backgroundColor: t.colors.card, borderRadius: t.radius.md, ...t.shadow.card }]}>
          <Text style={[styles.sectionTitle, t.typography.caption, { color: t.colors.subtext }]}>Delivery Hall</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hallScroll}>
            {HKUST_HALLS.map((hall) => {
              const selected = deliveryHall === hall;
              return (
                <TouchableOpacity
                  key={hall}
                  style={[
                    styles.hallChip,
                    {
                      backgroundColor: selected ? t.colors.accent : t.colors.bg,
                      borderColor: t.colors.border,
                      borderRadius: t.radius.pill,
                    }
                  ]}
                  onPress={() => setDeliveryHall(hall)}
                >
                  <Text style={{ color: selected ? '#fff' : t.colors.text }}>{hall}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Note Section */}
        <View style={[styles.section, { backgroundColor: t.colors.card, borderRadius: t.radius.md, ...t.shadow.card }]}>
          <Text style={[styles.sectionTitle, t.typography.caption, { color: t.colors.subtext }]}>Note</Text>
          <TextInput
            style={[styles.noteInput, { backgroundColor: t.colors.bg, color: t.colors.text, borderColor: t.colors.border }]}
            placeholder="Add a note for the deliverer (optional)"
            placeholderTextColor={t.colors.subtext}
            multiline
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* QR Code Status */}
        <View style={[styles.section, { backgroundColor: t.colors.card, borderRadius: t.radius.md, ...t.shadow.card, alignItems: 'center' }]}>
          {qrCodeImage ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome5 name="check-circle" size={18} color={t.colors.success} style={{ marginRight: 8 }} />
              <Text style={[styles.qrSuccessText, { color: t.colors.success }]}>QR Code Captured</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome5 name="qrcode" size={16} color={t.colors.subtext} style={{ marginRight: 8 }} />
              <Text style={{ color: t.colors.subtext }}>No QR code captured</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { backgroundColor: t.colors.bg, borderTopColor: t.colors.border }]}>
        <TouchableOpacity
          style={[styles.placeOrderBtn, { backgroundColor: t.colors.accent, opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order - ${totalPrice.toFixed(1)}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  canteenName: {
    // Handled by typography
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  input: {
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
  },
  removeBtn: {
    padding: 8,
  },
  addItemBtn: {
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  totalPrice: {
    // Handled by typography
  },
  hallScroll: {
    flexDirection: 'row',
  },
  hallChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  noteInput: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    height: 80,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  placeOrderBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  qrSuccessText: {
    fontWeight: 'bold',
  },
});
