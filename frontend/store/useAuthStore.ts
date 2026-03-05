// Uncomment SecureStore lines and remove AsyncStorage lines to switch to secure storage
// Uncommnet logAuthStore to check access and refresh tokens in development mode

import { create } from 'zustand';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
} as const;

const debugToken = (token: string | null) => {
  if (!token) {
    return null;
  }

  if (token.length <= 12) {
    return `${token.slice(0, 3)}...(${token.length})`;
  }

  return `${token.slice(0, 6)}...${token.slice(-4)} (${token.length})`;
};

// const logAuthStore = (event: string, payload: Record<string, unknown>) => {
//   if (!__DEV__) {
//     return;
//   }

//   console.log(`[AuthStore] ${event}`, payload);
// };

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  _hasHydrated: boolean;

  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  refreshToken: null,
  _hasHydrated: false,

  setTokens: async (accessToken: string, refreshToken: string) => {
    if (accessToken) {
      // await AsyncStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
      await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
    } else {
      // await AsyncStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
    }

    if (refreshToken) {
      // await AsyncStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
      await SecureStore.setItemAsync(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
    } else {
      // await AsyncStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH_TOKEN);
    }

    set({ accessToken: accessToken || null, refreshToken: refreshToken || null });
    // logAuthStore('setTokens', {
    //   hasAccessToken: Boolean(accessToken),
    //   accessToken: debugToken(accessToken || null),
    //   hasRefreshToken: Boolean(refreshToken),
    //   refreshToken: debugToken(refreshToken || null),
    // });
  },

  clearTokens: async () => {
    await Promise.all([
      // AsyncStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN),
      // AsyncStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH_TOKEN),
    ]);
    set({ accessToken: null, refreshToken: null });
    // logAuthStore('clearTokens', {
    //   hasAccessToken: false,
    //   hasRefreshToken: false,
    // });
  },

  hydrate: async () => {
    const [accessToken, refreshToken] = await Promise.all([
      // AsyncStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN),
      // AsyncStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN),
      SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN),
      SecureStore.getItemAsync(TOKEN_KEYS.REFRESH_TOKEN),
    ]);
    set({ accessToken, refreshToken, _hasHydrated: true });
    // logAuthStore('hydrate', {
    //   hasAccessToken: Boolean(accessToken),
    //   accessToken: debugToken(accessToken),
    //   hasRefreshToken: Boolean(refreshToken),
    //   refreshToken: debugToken(refreshToken),
    // });
  },
}));
