import { GoogleSignin } from '@react-native-google-signin/google-signin';

let hasConfiguredGoogleSignIn = false;

export function configureGoogleSignIn() {
  if (hasConfiguredGoogleSignIn) {
    return;
  }

  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });

  hasConfiguredGoogleSignIn = true;
}
