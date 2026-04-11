import { Button } from '@/components/ui/Button';
import Typography from '@/components/ui/Typography';
import { Eye, EyeClosed, CheckSquare, Square } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Palette } from '@/constants/theme';
import { Image } from 'expo-image';
import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import { authService } from '@/api/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingStore } from '@/store/useSettingStore';
import { extractWaitSeconds } from '@/constants/helper';
import type { LoginRequest } from '@/types/api';
import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';

export default function LoginScreen() {
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [credentialError, setCredentialError] = useState('');
  const { t } = useTranslation();
  const setTokens = useAuthStore((state) => state.setTokens);
  const hasCompletedCategoryOnboarding = useSettingStore(
    (state) => state.hasCompletedCategoryOnboarding
  );

  const loginMutation = useMutation({
    mutationFn: authService.login,
  });

  const googleLoginMutation = useMutation({
    mutationFn: authService.googleLoginMobile,
  });

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const signInResponse = await GoogleSignin.signIn();

      if (isCancelledResponse(signInResponse)) {
        return;
      }

      if (!isSuccessResponse(signInResponse)) {
        Alert.alert('Google login failed', 'Google sign-in did not complete successfully.');
        return;
      }

      if (!signInResponse.data.idToken) {
        Alert.alert('Google login failed', 'Could not get ID token from Google.');
        return;
      }

      const result = await googleLoginMutation.mutateAsync(signInResponse.data.idToken);
      await setTokens(result.accessToken, '');

      if (hasCompletedCategoryOnboarding) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(onboarding)/categories');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string })?.message ?? 'Google login failed';
        Alert.alert('Google login failed', message);
      } else {
        Alert.alert('Google login failed', 'Please try again.');
      }
    }
  };

  const resendVerifyMutation = useMutation({
    mutationFn: authService.resendVerifyEmail,
  });

  const validate = () => {
    let isValid = true;
    const normalizedIdentifier = identifier.trim();

    setIdentifierError('');
    setPasswordError('');
    setCredentialError('');

    if (!normalizedIdentifier) {
      setIdentifierError(t('errors.identifierRequired'));
      isValid = false;
    }

    if (!password) {
      setPasswordError(t('errors.passwordRequired'));
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError(t('errors.passwordMin'));
      isValid = false;
    } else if (
      !/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).+$/.test(password)
    ) {
      setPasswordError(t('errors.passwordComplex'));
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validate()) {
      return;
    }

    try {
      const result = await loginMutation.mutateAsync({
        identifier: identifier.trim(),
        password,
        rememberMe,
      } satisfies LoginRequest);

      await setTokens(result.accessToken, rememberMe ? result.refreshToken : '');
      if (hasCompletedCategoryOnboarding) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(onboarding)/categories');
      }
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        Alert.alert('Login failed', 'Please try again.');
        return;
      }

      const status = error.response?.status;

      if (status === 401) {
        setCredentialError(t('errors.invalidCredentials'));
        return;
      }

      if (status === 429) {
        setCredentialError(t('errors.tooManyRequests'));
        return;
      }

      if (status === 403) {
        const responseData = error.response?.data as { data?: { userId?: string } } | undefined;
        const userId = responseData?.data?.userId;

        if (!userId) {
          Alert.alert('Login failed', 'Unable to resend verification email.');
          return;
        }

        try {
          await resendVerifyMutation.mutateAsync(userId);
        } catch (resendError) {
          if (axios.isAxiosError(resendError)) {
            const resendStatus = resendError.response?.status;
            const resendMessage = (resendError.response?.data as { message?: string })?.message;

            if (resendStatus === 429) {
              const seconds = extractWaitSeconds(resendMessage);
              if (seconds !== null) {
                setCredentialError(t('errors.resendTooManyRequests', { seconds }));
                return;
              }
            }

            Alert.alert('Login failed', resendMessage ?? 'Unable to resend verification email.');
            return;
          }

          Alert.alert('Login failed', 'Unable to resend verification email.');
          return;
        }
        router.replace({
          pathname: '/check-email',
          params: { userId },
        });

        return;
      }

      const message =
        (error.response?.data as { message?: string })?.message ??
        'Login failed. Please try again.';
      Alert.alert('Login failed', message);
    }
  };

  return (
    <View className="mt-6">
      <View className="gap-4">
        <View>
          <Typography className="text-black/60 mb-2">{t('auth.identifier')}</Typography>
          <TextInput
            value={identifier}
            onChangeText={(value) => {
              setIdentifier(value);
              if (identifierError) {
                setIdentifierError('');
              }
              if (credentialError) {
                setCredentialError('');
              }
            }}
            autoCapitalize="none"
            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-black"
            placeholder={t('auth.identifier')}
          />
          {!!identifierError && (
            <Typography className="text-red-500 text-[11px] mt-1 ml-1 leading-4">
              {identifierError}
            </Typography>
          )}
        </View>

        <View>
          <Typography className="text-black/60 mb-2">{t('auth.password')}</Typography>
          <View className="rounded-xl border border-black/10 bg-white px-4 flex-row items-center justify-between">
            <TextInput
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (passwordError) {
                  setPasswordError('');
                }
                if (credentialError) {
                  setCredentialError('');
                }
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 text-black py-3 px-0"
              placeholder={t('auth.password')}
            />
            <Pressable onPress={() => setShowPassword((prev) => !prev)}>
              {showPassword ? (
                <EyeClosed size={18} color={Palette.grey} />
              ) : (
                <Eye size={18} color={Palette.grey} />
              )}
            </Pressable>
          </View>
          {!!passwordError && (
            <Typography className="text-red-500 text-[11px] mt-1 ml-1 leading-4">
              {passwordError}
            </Typography>
          )}
          {!!credentialError && (
            <View className="mt-2">
              <Typography className="text-red-500 text-[11px] ml-1 leading-4">
                {credentialError}
              </Typography>
            </View>
          )}
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <Pressable
          className="flex-row items-center gap-2"
          onPress={() => setRememberMe((prev) => !prev)}
        >
          {rememberMe ? (
            <CheckSquare size={18} color={Palette.grey} />
          ) : (
            <Square size={18} color={Palette.grey} />
          )}
          <Typography className="text-black/60">{t('auth.rememberMe')}</Typography>
        </Pressable>

        <Button variant="ghost" onPress={() => router.push('/forgot-password')}>
          <Typography className="text-gray-600">{t('auth.forgotPassword')}</Typography>
        </Button>
      </View>

      <Button
        size="lg"
        rounded="lg"
        className="w-full mt-6"
        onPress={handleLogin}
        disabled={loginMutation.isPending || resendVerifyMutation.isPending}
      >
        {loginMutation.isPending || resendVerifyMutation.isPending ? 'Loading...' : t('auth.login')}
      </Button>

      <View className="flex-row items-center mt-7">
        <View className="h-[1px] bg-black/10 flex-1" />
        <Typography className="mx-3 text-black/50">{t('auth.or')}</Typography>
        <View className="h-[1px] bg-black/10 flex-1" />
      </View>

      <View className="h-[24px]" />

      <Pressable
        className="w-full h-[52px] items-center justify-center p-1"
        onPress={handleGoogleSignIn}
        disabled={googleLoginMutation.isPending}
      >
        <Image
          source={require('@/assets/images/google_button.svg')}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
        />
      </Pressable>
    </View>
  );
}
