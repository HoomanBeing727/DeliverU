import client from './client';
import { Rating } from '../types';

export interface SubmitRatingPayload {
  stars: number;
  feedback?: string | null;
}

export async function submitRating(orderId: string, payload: SubmitRatingPayload): Promise<Rating> {
  const { data } = await client.post<Rating>(`/orders/${orderId}/rate`, payload);
  return data;
}

export async function getOrderRatings(orderId: string): Promise<Rating[]> {
  const { data } = await client.get<Rating[]>(`/orders/${orderId}/ratings`);
  return data;
}
