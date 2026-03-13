import client from './client';
import { Order, OrderItem } from '../types';

export interface CreateOrderPayload {
  canteen: string;
  items: OrderItem[];
  total_price: number;
  delivery_hall: string;
  note?: string | null;
  qr_code_image?: string | null;
  qr_code_data?: string | null;
  is_group_open?: boolean;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const { data } = await client.post<Order>('/orders', payload);
  return data;
}

export async function getMyOrders(): Promise<Order[]> {
  const { data } = await client.get<Order[]>('/orders/my');
  return data;
}

export async function getDelivererQueue(): Promise<Order[]> {
  const { data } = await client.get<Order[]>('/orders/queue');
  return data;
}
export async function getMyDeliveries(): Promise<Order[]> {
  const { data } = await client.get<Order[]>('/orders/my-deliveries');
  return data;
}


export async function getOrderDetail(orderId: string): Promise<Order> {
  const { data } = await client.get<Order>(`/orders/${orderId}`);
  return data;
}

export async function acceptOrder(orderId: string): Promise<Order> {
  const { data } = await client.patch<Order>(`/orders/${orderId}/accept`);
  return data;
}

export async function pickupOrder(orderId: string): Promise<Order> {
  const { data } = await client.patch<Order>(`/orders/${orderId}/pickup`);
  return data;
}

export async function deliverOrder(orderId: string): Promise<Order> {
  const { data } = await client.patch<Order>(`/orders/${orderId}/deliver`);
  return data;
}

export async function cancelOrder(orderId: string): Promise<Order> {
  const { data } = await client.patch<Order>(`/orders/${orderId}/cancel`);
  return data;
}
