import client from './client';
import { CreditTransaction } from '../types';

export interface CreditBalance {
  credits: number;
}

export interface CreditHistory {
  transactions: CreditTransaction[];
}

export async function getCreditBalance(): Promise<CreditBalance> {
  const { data } = await client.get<CreditBalance>('/credits/balance');
  return data;
}

export async function getCreditHistory(): Promise<CreditHistory> {
  const { data } = await client.get<CreditHistory>('/credits/history');
  return data;
}
