// Uncomment SecureStore lines and remove AsyncStorage lines to switch to secure storage
// Uncommnet logAuthStore to check access and refresh tokens in development mode

import { create } from 'zustand';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { authService } from '@/api/auth';
import type { AuthMeResponse } from '@/types/api';

const TOKEN_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  // Kept only for legacy cleanup in clearTokens
  REFRESH_TOKEN: 'auth_refresh_token',
} as const;

const DEFAULT_ME_CACHE_TTL_MS = 60 * 1000;
let fetchMePromise: Promise<AuthMeResponse | null> | null = null;

// const logAuthStore = (event: string, payload: Record<string, unknown>) => {
//   if (!__DEV__) {
//     return;
//   }

//   console.log(`[AuthStore] ${event}`, payload);
// };

interface AuthState {
  accessToken: string | null;
  canRefresh: boolean;
  postLogoutNoticeKey: string | null;
  me: AuthMeResponse | null;
  meFetchedAt: number;
  avatarCacheEpoch: number;
  isFetchingMe: boolean;
  _hasHydrated: boolean;

  setTokens: (accessToken: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  setPostLogoutNoticeKey: (noticeKey: string | null) => void;
  consumePostLogoutNoticeKey: () => string | null;
  setMe: (profile: AuthMeResponse | null) => void;
  fetchMe: (options?: { force?: boolean; ttlMs?: number }) => Promise<AuthMeResponse | null>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  canRefresh: false,
  postLogoutNoticeKey: null,
  me: null,
  meFetchedAt: 0,
  avatarCacheEpoch: 0,
  isFetchingMe: false,
  _hasHydrated: false,

  setTokens: async (accessToken: string) => {
    if (accessToken) {
      // await AsyncStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
      await SecureStore.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
    } else {
      // await AsyncStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
    }

    set({
      accessToken: accessToken || null,
      canRefresh: Boolean(accessToken),
      postLogoutNoticeKey: null,
      me: null,
      meFetchedAt: 0,
      avatarCacheEpoch: Date.now(),
    });
    // logAuthStore('setTokens', {
    //   hasAccessToken: Boolean(accessToken),
    //   accessToken: debugToken(accessToken || null),
    // });
  },

  clearTokens: async () => {
    await Promise.all([
      // AsyncStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN),
      // AsyncStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(TOKEN_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(TOKEN_KEYS.REFRESH_TOKEN), // clean up any legacy stored refresh token
    ]);
    set({
      accessToken: null,
      canRefresh: false,
      me: null,
      meFetchedAt: 0,
      avatarCacheEpoch: Date.now(),
      isFetchingMe: false,
    });
    // logAuthStore('clearTokens', {
    //   hasAccessToken: false,
    //   hasRefreshToken: false,
    // });
  },

  setPostLogoutNoticeKey: (noticeKey) => {
    set({ postLogoutNoticeKey: noticeKey });
  },

  consumePostLogoutNoticeKey: (): string | null => {
    let current: string | null = null;

    set((state) => {
      current = state.postLogoutNoticeKey;
      if (!current) {
        return state;
      }

      return {
        ...state,
        postLogoutNoticeKey: null,
      };
    });

    return current;
  },

  setMe: (profile) => {
    set({ me: profile, meFetchedAt: profile ? Date.now() : 0 });
  },

  fetchMe: async (options) => {
    const { accessToken, me, meFetchedAt } = get();
    if (!accessToken) {
      set({ me: null, meFetchedAt: 0, isFetchingMe: false });
      return null;
    }

    const force = options?.force ?? false;
    const ttlMs = options?.ttlMs ?? DEFAULT_ME_CACHE_TTL_MS;
    const isCacheValid = !!me && Date.now() - meFetchedAt < ttlMs;

    if (!force && isCacheValid) {
      return me;
    }

    if (fetchMePromise) {
      return fetchMePromise;
    }

    set({ isFetchingMe: true });
    fetchMePromise = authService
      .getMe()
      .then((profile) => {
        set({ me: profile, meFetchedAt: Date.now() });
        return profile;
      })
      .catch(() => {
        set({ me: null, meFetchedAt: 0 });
        return null;
      })
      .finally(() => {
        fetchMePromise = null;
        set({ isFetchingMe: false });
      });

    return fetchMePromise;
  },

  hydrate: async () => {
    const accessToken = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
    // await AsyncStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN),
    set({
      accessToken,
      canRefresh: Boolean(accessToken),
      me: accessToken ? get().me : null,
      meFetchedAt: accessToken ? get().meFetchedAt : 0,
      avatarCacheEpoch: get().avatarCacheEpoch || Date.now(),
      _hasHydrated: true,
    });
    // logAuthStore('hydrate', {
    //   hasAccessToken: Boolean(accessToken),
    //   accessToken: debugToken(accessToken),
    // });
  },
}));
