import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

const baseURL = envBaseUrl || Platform.select({
  android: 'http://10.89.171.127:8000',
  ios: 'http://10.89.171.127:8000',
  default: 'http://localhost:8000',
});

const client = axios.create({ baseURL });

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
