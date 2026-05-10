import { Platform } from 'react-native';
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
      '[notification] Missing EXPO_PUBLIC_DEVICE_TOKEN_ENDPOINT. Skip syncing FCM token to backend.'
    );
  }
};

export const notificationService = {
  syncDeviceToken: async (token: string): Promise<boolean> => {
    if (!token.trim()) {
      return false;
    }

    if (!DEVICE_TOKEN_ENDPOINT) {
      logMissingDeviceTokenEndpoint();
      return false;
    }

    await apiClient.post(DEVICE_TOKEN_ENDPOINT, {
      token,
      platform: Platform.OS,
    });

    return true;
  },
};
