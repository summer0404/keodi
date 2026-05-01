import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { API_ENDPOINTS } from '@/constants/api';
import { router } from 'expo-router';

export const resolveApiBaseUrl = () => {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
};

export const API_BASE_URL = resolveApiBaseUrl();

const AUTH_BYPASS_REFRESH_ENDPOINTS = [
  API_ENDPOINTS.LOGIN,
  API_ENDPOINTS.REFRESH,
  API_ENDPOINTS.REGISTER,
  API_ENDPOINTS.FORGOT_PASSWORD_OTP,
  API_ENDPOINTS.VALIDATE_FORGOT_PASSWORD_OTP,
  API_ENDPOINTS.RESET_PASSWORD,
  API_ENDPOINTS.GOOGLE_LOGIN_MOBILE,
] as const;

const isRefreshBypassedRequest = (url?: string) => {
  if (!url) {
    return false;
  }

  return (
    AUTH_BYPASS_REFRESH_ENDPOINTS.some((endpoint) => url === endpoint || url.endsWith(endpoint)) ||
    url.startsWith(API_ENDPOINTS.RESEND_VERIFY_EMAIL) ||
    url.includes(`${API_ENDPOINTS.RESEND_VERIFY_EMAIL}/`)
  );
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach access token
apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;

  if (accessToken && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// Response interceptor: auto-refresh on 401
let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only intercept 401 for non-auth endpoints and non-retried requests
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isRefreshBypassedRequest(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const { clearTokens, setTokens } = useAuthStore.getState();

    try {
      // Call refresh endpoint without sending refresh token in body.
      // Backend is expected to read httpOnly cookie and return a new access token.
      const { data } = await apiClient.post(API_ENDPOINTS.REFRESH);

      // Update access token in frontend state. Do not store refresh token client-side.
      await setTokens(data.accessToken, data.refreshToken ?? '');
      processQueue(null, data.accessToken);

      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await clearTokens();
      router.replace('/login');
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
