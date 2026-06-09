import Typography from '@/components/ui/Typography';
import { Slot, usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/useAuthStore';

export default function AuthLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const authHydrated = useAuthStore((s) => s._hasHydrated);

  const isForgotPassword = pathname.endsWith('/forgot-password');
  const isNewPassword = pathname.endsWith('/new-password');
  const isLogin = pathname.endsWith('/login');
  const isSignup = pathname.endsWith('/signup');
  const isCheckEmail = pathname.endsWith('/check-email');

  useEffect(() => {
    if (authHydrated && accessToken) {
      router.replace('/(tabs)');
      return;
    }

    if (!isLogin && !isSignup && !isForgotPassword && !isNewPassword && !isCheckEmail) {
      router.replace('/login');
    }
  }, [pathname, authHydrated, accessToken]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 pt-16">
          <View className="items-center mb-4">
            <Image
              source={require('../../assets/images/logo.png')}
              className="w-[120px] h-[72px]"
              resizeMode="contain"
            />
          </View>
          {!isForgotPassword && !isNewPassword && !isCheckEmail && (
            <>
              <Typography variant="h3" className="text-center">
                {t('auth.title')}
              </Typography>
              <Typography className="text-center text-black/60 mt-2">
                {t('auth.description')}
              </Typography>

              <View className="mt-6 flex-row rounded-lg bg-gray-200 p-1">
                <Pressable
                  className={`flex-1 rounded-md py-2 items-center ${isLogin ? 'bg-white' : ''}`}
                  onPress={() => router.replace('/login')}
                >
                  <Typography className={isLogin ? 'text-black' : 'text-black/60'}>
                    {t('auth.login')}
                  </Typography>
                </Pressable>
                <Pressable
                  className={`flex-1 rounded-md py-2 items-center ${!isLogin ? 'bg-white' : ''}`}
                  onPress={() => router.replace('/signup')}
                >
                  <Typography className={!isLogin ? 'text-black' : 'text-black/60'}>
                    {t('auth.signUp')}
                  </Typography>
                </Pressable>
              </View>
            </>
          )}

          <Slot />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
