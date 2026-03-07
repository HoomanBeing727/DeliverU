import client from './client';
import { ChatMessage } from '../types';

export interface SendMessagePayload {
  content: string;
}

export async function sendMessage(orderId: string, payload: SendMessagePayload): Promise<ChatMessage> {
  const { data } = await client.post<ChatMessage>(`/orders/${orderId}/chat`, payload);
  return data;
}

export async function getMessages(orderId: string, since?: string): Promise<ChatMessage[]> {
  const params = since ? { since } : {};
  const { data } = await client.get<ChatMessage[]>(`/orders/${orderId}/chat`, { params });
  return data;
}
