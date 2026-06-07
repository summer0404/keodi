import { Platform } from 'react-native';
import { API_ENDPOINTS } from '@/constants/api';
import type {
  GetNotificationInboxRequest,
  NotificationInboxResponse,
  UnreadNotificationCountResponse,
} from '@/types/api';
import { apiClient } from './client';

const DEVICE_TOKEN_ENDPOINT = process.env.EXPO_PUBLIC_DEVICE_TOKEN_ENDPOINT?.trim();

let hasLoggedMissingEndpoint = false;

const logMissingDeviceTokenEndpoint = () => {
  if (hasLoggedMissingEndpoint) {
    return;
  }

  hasLoggedMissingEndpoint = true;

  if (__DEV__) {
    console.warn(
      '[notification] ⚠️  Missing or invalid EXPO_PUBLIC_DEVICE_TOKEN_ENDPOINT. Device tokens will NOT sync to backend.',
      { endpoint: DEVICE_TOKEN_ENDPOINT || '(not set)' }
    );
  }
};

export const notificationService = {
  getInbox: async (params: GetNotificationInboxRequest): Promise<NotificationInboxResponse> => {
    const response = await apiClient.get<NotificationInboxResponse>(API_ENDPOINTS.NOTIFICATIONS, {
      params,
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<UnreadNotificationCountResponse> => {
    const response = await apiClient.get<UnreadNotificationCountResponse>(
      `${API_ENDPOINTS.NOTIFICATIONS}/unread-count`
    );
    return response.data;
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    await apiClient.patch(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch(`${API_ENDPOINTS.NOTIFICATIONS}/read-all`);
  },

  syncDeviceToken: async (token: string): Promise<boolean> => {
    if (!token.trim()) {
      return false;
    }

    if (!DEVICE_TOKEN_ENDPOINT) {
      logMissingDeviceTokenEndpoint();
      return false;
    }

    await apiClient.put(DEVICE_TOKEN_ENDPOINT, {
      token,
      platform: Platform.OS.toUpperCase(),
    });

    return true;
  },
};
