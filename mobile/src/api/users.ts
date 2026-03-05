import client from './client';
import { UserProfile, ProfileSetupPayload } from '../types';

export async function getProfile(): Promise<UserProfile> {
  const { data } = await client.get<UserProfile>('/users/me');
  return data;
}

export async function setupProfile(payload: ProfileSetupPayload): Promise<UserProfile> {
  const { data } = await client.put<UserProfile>('/users/me/profile', payload);
  return data;
}

export async function toggleDarkMode(dark_mode: boolean): Promise<UserProfile> {
  const { data } = await client.patch<UserProfile>('/users/me/dark-mode', { dark_mode });
  return data;
}

export async function toggleDeliverer(is_deliverer: boolean): Promise<UserProfile> {
  const { data } = await client.patch<UserProfile>('/users/me/deliverer-toggle', { is_deliverer });
  return data;
}
