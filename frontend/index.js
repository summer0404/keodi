import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async () => {
  // Keep handler registered so Firebase can wake JS runtime for data messages.
});

require('expo-router/entry');
