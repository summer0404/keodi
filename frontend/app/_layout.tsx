import '../global.css';
import i18n from '@/i18n';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useFonts } from 'expo-font';
import { Montserrat_400Regular, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useAuthStore } from '@/store/useAuthStore';
import { useSettingStore } from '@/store/useSettingStore';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppQueryProvider } from '@/providers/query-provider';
import { configureGoogleSignIn } from '@/api/google-signin';
import { useNotificationRuntime } from '@/hooks/use-notification-runtime';
import InAppNotificationCard from '@/components/ui/InAppNotificationCard';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();
configureGoogleSignIn();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { language, _hasHydrated: settingsHydrated, hasSeenOnboarding } = useSettingStore();
  const authHydrated = useAuthStore((s) => s._hasHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const { banner, dismissBanner, openBanner, isPrimaryLoading } = useNotificationRuntime({
    accessToken,
  });

  const [fontsLoaded] = useFonts({
    'Montserrat-SemiBold': Montserrat_600SemiBold,
    'Montserrat-Regular': Montserrat_400Regular,
  });

  // Hydrate auth tokens from SecureStore on app launch
  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (fontsLoaded && settingsHydrated && authHydrated) {
      i18n.changeLanguage(language);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, settingsHydrated, authHydrated, language]);

  useEffect(() => {
    if (!authHydrated || !accessToken) {
      return;
    }

    void fetchMe();
  }, [accessToken, authHydrated, fetchMe]);

  // If fonts or settings or auth are not loaded yet, don't render anything
  if (!fontsLoaded || !settingsHydrated || !authHydrated) return null;

  const getInitialRouteName = () => {
    if (!hasSeenOnboarding) return '(onboarding)';
    if (accessToken) return '(tabs)';
    return '(auth)';
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppQueryProvider>
        <SafeAreaProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack initialRouteName={getInitialRouteName()}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="place/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="join/[code]" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>

            {banner ? (
              <View
                pointerEvents="box-none"
                style={{ position: 'absolute', top: 56, left: 12, right: 12, zIndex: 999 }}
              >
                <InAppNotificationCard
                  model={banner}
                  onDismiss={dismissBanner}
                  onPrimary={openBanner}
                  primaryLoading={isPrimaryLoading}
                />
              </View>
            ) : null}

            <StatusBar style="auto" />
          </ThemeProvider>
        </SafeAreaProvider>
      </AppQueryProvider>
    </GestureHandlerRootView>
  );
}
