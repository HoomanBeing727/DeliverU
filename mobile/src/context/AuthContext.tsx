import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { UserProfile } from '../types';
import { loginUser, registerUser } from '../api/auth';
import { getProfile } from '../api/users';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('access_token');
        if (stored) {
          setToken(stored);
          const profile = await getProfile();
          setUser(profile);
        }
      } catch {
        await AsyncStorage.removeItem('access_token');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const res = await loginUser(email, password);
    await AsyncStorage.setItem('access_token', res.access_token);
    setToken(res.access_token);
    const profile = await getProfile();
    setUser(profile);
  }

  async function register(email: string, password: string) {
    const res = await registerUser(email, password);
    await AsyncStorage.setItem('access_token', res.access_token);
    setToken(res.access_token);
    const profile = await getProfile();
    setUser(profile);
  }

  async function logout() {
    await AsyncStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    const profile = await getProfile();
    setUser(profile);
  }

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
