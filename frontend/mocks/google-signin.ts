// Temporary mock for @react-native-google-signin/google-signin
// Allows running on Expo Go without native binary

export const GoogleSignin = {
  configure: () => {},
  hasPlayServices: async () => true,
  signIn: async () => ({ type: 'cancelled' as const }),
};

export const isCancelledResponse = (response: { type: string }) =>
  response.type === 'cancelled';

export const isSuccessResponse = (response: { type: string }) =>
  response.type === 'success';
