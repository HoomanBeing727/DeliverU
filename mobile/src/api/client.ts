import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Auto-detect backend URL from Expo dev host.
 * Attempts to read hostUri from Expo Constants and extract LAN IP.
 * Returns null if no valid LAN host is found or if tunnel is detected.
 */
function getAutoDetectedBackendURL(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.hostUri;

  if (!hostUri) return null;

  const host = hostUri.split(':')[0];
  if (!host || host.includes('expo.dev')) return null;

  return `http://${host}:8000`;
}

const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const autoDetectedURL = getAutoDetectedBackendURL();

const baseURL =
  envBaseUrl ||
  autoDetectedURL ||
  Platform.select({
    default: 'http://localhost:8000',
  });

if (__DEV__) {
  console.log(
    `[API] Base URL resolved to: ${baseURL} (env: ${envBaseUrl || 'none'}, auto: ${autoDetectedURL || 'none'})`
  );
}

const client = axios.create({ baseURL });

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
