import { Linking, Platform, Alert } from 'react-native';

/**
 * Opens the app settings where users can manually enable notifications
 * Use this to guide users to enable notifications if they previously denied permission
 */
export const openNotificationSettings = async () => {
  try {
    if (Platform.OS === 'ios') {
      // iOS: Open app settings
      await Linking.openURL('app-settings://');
    } else if (Platform.OS === 'android') {
      // Android: Open app notification settings
      await Linking.openURL('android.settings:///');
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[notification] Failed to open settings', error);
    }
    Alert.alert(
      'Unable to Open Settings',
      'Please manually open Settings > Apps > Keodi > Notifications'
    );
  }
};

/**
 * Shows a dialog guiding users to enable notifications
 */
export const showEnableNotificationsDialog = (onRetry?: () => void) => {
  Alert.alert(
    'Enable Notifications?',
    'Notifications help you stay updated with invitations, votes, and session activities.',
    [
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Settings',
        onPress: () => {
          void openNotificationSettings();
        },
      },
      ...(onRetry
        ? [
            {
              text: 'Try Again',
              onPress: onRetry,
            },
          ]
        : []),
    ]
  );
};
