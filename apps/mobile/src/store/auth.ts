import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isBiometricEnabled } from '@/services/biometric';
import { authService } from '@/services/auth';
import { setLoggingOut } from '@/services/api';

interface User {
  id: string;
  email: string;
  role: 'USER' | 'THERAPIST' | 'ADMIN';
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  hasSeenOnboarding: boolean;
  biometricEnabled: boolean;
  hasOfferedBiometric: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => void;
  setHasOfferedBiometric: (offered: boolean) => Promise<void>;
  resetLoggingOut: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  isLoggingOut: false,
  hasSeenOnboarding: false,
  biometricEnabled: false,
  hasOfferedBiometric: false,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  setTokens: async (accessToken, refreshToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ accessToken, refreshToken });
  },

  logout: async () => {
    if (__DEV__) console.log('Logout: starting...');
    // Prevent API interceptor from refreshing tokens during logout
    setLoggingOut(true);

    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }

    // Keep biometric credentials so user can log back in with biometric
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoggingOut: false,
    });

    // Reset the API flag
    setLoggingOut(false);
    if (__DEV__) console.log('Logout: complete');
  },

  loadStoredAuth: async () => {
    try {
      const [accessToken, refreshToken, hasSeenOnboarding, hasOfferedBiometric] = await Promise.all([
        SecureStore.getItemAsync('accessToken'),
        SecureStore.getItemAsync('refreshToken'),
        AsyncStorage.getItem('hasSeenOnboarding'),
        AsyncStorage.getItem('hasOfferedBiometric'),
      ]);

      // Check biometric status
      const biometricEnabled = await isBiometricEnabled();

      if (accessToken && refreshToken) {
        set({ accessToken, refreshToken, isAuthenticated: true });
        // Fetch user profile from API to validate token
        try {
          const user = await authService.getMe();
          set({ user });
        } catch (error) {
          // Token might be expired, clear auth state
          console.error('Failed to fetch user profile:', error);
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
          set({ accessToken: null, refreshToken: null, isAuthenticated: false });
        }
      }

      set({
        hasSeenOnboarding: hasSeenOnboarding === 'true',
        hasOfferedBiometric: hasOfferedBiometric === 'true',
        biometricEnabled,
      });
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    set({ hasSeenOnboarding: true });
  },

  setBiometricEnabled: (enabled) => {
    set({ biometricEnabled: enabled });
  },

  setHasOfferedBiometric: async (offered) => {
    await AsyncStorage.setItem('hasOfferedBiometric', offered ? 'true' : 'false');
    set({ hasOfferedBiometric: offered });
  },

  resetLoggingOut: () => {
    set({ isLoggingOut: false });
  },
}));
