import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import api from '../api/client';

// Platform-specific storage helpers
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  university_name?: string;
  is_verified: boolean;
  wallet_balance: number;
  loyalty_points: number;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  nin?: string;
  university_name?: string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user } = response.data;
    
    await storage.setItem('auth_token', access_token);
    
    set({
      user,
      token: access_token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  register: async (data: RegisterData) => {
    const response = await api.post('/auth/register', data);
    const { access_token, user } = response.data;
    
    await storage.setItem('auth_token', access_token);
    
    set({
      user,
      token: access_token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async () => {
    await storage.deleteItem('auth_token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  loadUser: async () => {
    try {
      const token = await storage.getItem('auth_token');
      if (token) {
        const response = await api.get('/auth/me');
        set({
          user: response.data,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      await storage.deleteItem('auth_token');
      set({ isLoading: false, isAuthenticated: false, user: null, token: null });
    }
  },

  refreshUser: async () => {
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data });
    } catch (error) {
      console.log('Error refreshing user:', error);
    }
  },
}));
