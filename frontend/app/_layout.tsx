import '../global.css';
import '@/i18n';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useFonts } from 'expo-font';
import { Montserrat_400Regular, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import { useEffect } from 'react';
import i18n from '@/i18n';
import { useSettingStore } from '@/store/useSettingStore';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { language, _hasHydrated } = useSettingStore();

  const [fontsLoaded] = useFonts({
    'Montserrat-SemiBold': Montserrat_600SemiBold,
    'Montserrat-Regular': Montserrat_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded && _hasHydrated) {
      i18n.changeLanguage(language);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, _hasHydrated, language]);

  // If fonts or settings are not loaded yet, don't render anything
  if (!fontsLoaded || !_hasHydrated) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
