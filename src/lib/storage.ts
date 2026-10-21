import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Small key/value store. The API token lives in the device keychain /
 * keystore (expo-secure-store); the web preview falls back to localStorage.
 */
export const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* storage unavailable */
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        /* storage unavailable */
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const KEYS = {
  token: 'physio360.token',
  server: 'physio360.server',
  email: 'physio360.lastEmail',
  biometric: 'physio360.biometric',
} as const;
