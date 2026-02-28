import { authService } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import Typography from '@/components/ui/Typography';
import { extractWaitSeconds } from '@/constants/helper';
import { Palette } from '@/constants/theme';
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Eye, EyeClosed } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import axios from 'axios';
import { type TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const createResetPasswordSchema = (t: TFunction) =>
  z
    .string()
    .nonempty({ message: t('errors.passwordRequired') })
    .min(8, { message: t('errors.passwordMin') })
    .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).+$/, {
      message: t('errors.passwordComplex'),
    });

export default function NewPasswordScreen() {
  const router = useRouter();
  const { resetToken } = useLocalSearchParams<{ resetToken?: string }>();
  const normalizedResetToken = Array.isArray(resetToken) ? resetToken[0] : resetToken;
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();

  const passwordSchema = useMemo(() => createResetPasswordSchema(t), [t]);

  const resetPasswordMutation = useMutation({
    mutationFn: ({ password, token }: { password: string; token: string }) =>
      authService.resetPassword({ newPassword: password }, token),
  });

  const validate = () => {
    setPasswordError('');
    setRequestError('');

    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      setPasswordError(parsed.error.issues[0]?.message ?? t('errors.unexpectedError'));
      return false;
    }

    if (!normalizedResetToken) {
      setRequestError(t('errors.resetTokenMissing'));
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validate()) {
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({
        password: newPassword,
        token: normalizedResetToken,
      });
      router.replace('/login');
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        setRequestError(t('errors.unexpectedError'));
        return;
      }

      const status = error.response?.status;
      const message = (error.response?.data as { message?: string })?.message;

      if (status === 429) {
        const seconds = extractWaitSeconds(message);
        if (seconds !== null) {
          setRequestError(t('errors.otpTooManyRequests', { seconds }));
          return;
        }

        setRequestError(t('errors.tooManyRequests'));
        return;
      }

      if (status === 401) {
        setRequestError(t('errors.resetTokenExpired'));
        return;
      }

      if (message) {
        setRequestError(message);
        return;
      }

      setRequestError(t('errors.unexpectedError'));
    }
  };

  return (
    <View>
      <Typography variant="h3" className="text-black text-center">
        {t('auth.newPasswordTitle')}
      </Typography>
      <Typography className="text-black/60 text-center mt-2 mb-8">
        {t('auth.newPasswordDescription')}
      </Typography>

      <Typography className="text-black/60 mb-2">{t('auth.setPassword')}</Typography>
      <View className="rounded-xl border border-black/10 bg-white px-4 flex-row items-center justify-between">
        <TextInput
          value={newPassword}
          onChangeText={(value) => {
            setNewPassword(value);
            if (passwordError) {
              setPasswordError('');
            }
            if (requestError) {
              setRequestError('');
            }
          }}
          secureTextEntry={!showPassword}
          className="flex-1 text-black px-0"
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
      {!!requestError && (
        <Typography className="text-red-500 text-[11px] mt-2 ml-1 leading-4">
          {requestError}
        </Typography>
      )}

      <Button
        rounded="lg"
        size="lg"
        className="w-full mt-6"
        onPress={handleResetPassword}
        disabled={resetPasswordMutation.isPending}
      >
        {resetPasswordMutation.isPending ? 'Loading...' : t('auth.resetPassword')}
      </Button>

      <Pressable className="mt-6 items-center" onPress={() => router.replace('/login')}>
        <Typography className="text-[#3B82F6]">{t('auth.backToLogin')}</Typography>
      </Pressable>
    </View>
  );
}
