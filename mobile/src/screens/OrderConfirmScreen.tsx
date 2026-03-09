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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { createOrder, CreateOrderPayload } from '../api/orders';
import { RootStackParamList, OrderItem } from '../types';
import { HKUST_HALLS } from '../constants/dorms';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderConfirm'>;

export default function OrderConfirmScreen({ navigation, route }: Props) {
  const { canteen, qrCodeImage, qrCodeData, totalPrice: passedPrice, items: passedItems } = route.params;
  const { user } = useAuth();
  
  const isDark = user?.dark_mode ?? false;
  const colors = isDark
    ? { bg: '#1a1a2e', card: '#16213e', text: '#eee', sub: '#aaa', accent: '#0f3460', input: '#1e2a45', border: '#2a3a5c' }
    : { bg: '#f5f5f5', card: '#fff', text: '#333', sub: '#666', accent: '#003366', input: '#fff', border: '#ddd' };

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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Confirm Order</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Canteen Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.sub }]}>Canteen</Text>
          <Text style={[styles.canteenName, { color: colors.text }]}>{canteen}</Text>
        </View>

        {/* Order Items Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.sub }]}>Order Items</Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <TextInput
                style={[styles.input, { flex: 2, backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
                placeholder="Item Name"
                placeholderTextColor={colors.sub}
                value={item.name}
                onChangeText={(text) => updateItem(index, 'name', text)}
              />
              <TextInput
                style={[styles.input, { flex: 0.5, backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
                placeholder="Qty"
                placeholderTextColor={colors.sub}
                keyboardType="numeric"
                value={item.qty.toString()}
                onChangeText={(text) => updateItem(index, 'qty', text)}
              />
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
                placeholder="Price"
                placeholderTextColor={colors.sub}
                keyboardType="numeric"
                value={item.price.toString()}
                onChangeText={(text) => updateItem(index, 'price', text)}
              />
              <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn}>
                <Text style={{ color: colors.sub, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={addItem} style={styles.addItemBtn}>
            <Text style={{ color: colors.accent, fontWeight: 'bold' }}>+ Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Total Price Section */}
        <View style={[styles.section, { backgroundColor: colors.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[styles.sectionTitle, { color: colors.sub, marginBottom: 0 }]}>Total Price</Text>
          <Text style={[styles.totalPrice, { color: colors.accent }]}>${totalPrice.toFixed(1)}</Text>
        </View>

        {/* Delivery Hall Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.sub }]}>Delivery Hall</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hallScroll}>
            {HKUST_HALLS.map((hall) => {
              const selected = deliveryHall === hall;
              return (
                <TouchableOpacity
                  key={hall}
                  style={[
                    styles.hallChip,
                    { 
                      backgroundColor: selected ? colors.accent : colors.input,
                      borderColor: colors.border 
                    }
                  ]}
                  onPress={() => setDeliveryHall(hall)}
                >
                  <Text style={{ color: selected ? '#fff' : colors.text }}>{hall}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Note Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.sub }]}>Note</Text>
          <TextInput
            style={[styles.noteInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            placeholder="Add a note for the deliverer (optional)"
            placeholderTextColor={colors.sub}
            multiline
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* QR Code Status */}
        <View style={[styles.section, { backgroundColor: colors.card, alignItems: 'center' }]}>
          {qrCodeImage ? (
            <Text style={{ color: '#4caf50', fontWeight: 'bold' }}>QR Code Captured ✓</Text>
          ) : (
            <Text style={{ color: colors.sub }}>No QR code captured</Text>
          )}
        </View>

      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.placeOrderBtn, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
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
  header: {
    padding: 16,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
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
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  canteenName: {
    fontSize: 18,
    fontWeight: 'bold',
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
    fontSize: 24,
    fontWeight: 'bold',
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
});
