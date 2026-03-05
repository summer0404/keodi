import { Button } from '@/components/ui/Button';
import Typography from '@/components/ui/Typography';
import { Eye, EyeClosed } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { type TFunction } from 'i18next';
import { Palette } from '@/constants/theme';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { authService } from '@/api/auth';
import { sanitizeUsername, extractWaitSeconds } from '@/constants/helper';

type RegisterFormValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const createRegisterSchema = (t: TFunction) =>
  z
    .object({
      username: z
        .string()
        .nonempty({ message: t('errors.usernameRequired') })
        .max(20, { message: t('errors.usernameMax') })
        .min(3, { message: t('errors.usernameMin') })
        .regex(/^[a-z0-9._]+$/, { message: t('errors.usernameInvalid') })
        .refine((s) => !/^\d+$/.test(s), { message: t('errors.usernameNotAllNumbers') }),
      email: z
        .string()
        .nonempty({ message: t('errors.emailRequired') })
        .email({ message: t('errors.emailInvalid') }),
      password: z
        .string()
        .nonempty({ message: t('errors.passwordRequired') })
        .min(8, { message: t('errors.passwordMin') })
        .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).+$/, {
          message: t('errors.passwordComplex'),
        }),
      confirmPassword: z.string().nonempty({ message: t('errors.confirmPasswordRequired') }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('errors.passwordMatch'),
      path: ['confirmPassword'],
    });

export default function RegisterScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { t } = useTranslation();

  const schema = useMemo(() => createRegisterSchema(t), [t]);

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
  });

  const handleSignUp = handleSubmit((values: RegisterFormValues) => {
    registerMutation.mutate(
      {
        username: values.username,
        email: values.email,
        password: values.password,
      },
      {
        onSuccess: () => {
          router.replace('/check-email');
        },
        onError: (error) => {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const message =
              (error.response?.data as { message?: string })?.message ??
              error.message ??
              'Register failed.';

            if (status === 400 && message === 'Username already exists') {
              setError('username', {
                type: 'server',
                message: t('errors.usernameExists'),
              });
              return;
            }

            if (status === 400 && message === 'Email already exists') {
              setError('email', {
                type: 'server',
                message: t('errors.emailExists'),
              });
              return;
            }

            if (status === 429) {
              const seconds = extractWaitSeconds(message);
              if (seconds !== null) {
                Alert.alert('Register failed', t('errors.resendTooManyRequests', { seconds }));
                return;
              }
            }

            router.replace('/check-email');
            Alert.alert('Register failed', message);

            return;
          }
          router.replace('/check-email');
          Alert.alert('Register failed', 'Please try again.');
        },
      }
    );
  });

  return (
    <View className="mt-6">
      <View className="gap-4">
        <View>
          <Typography className="text-black/60 mb-2">{t('auth.username')}</Typography>
          <Controller
            control={control}
            name="username"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={(text) => {
                  field.onChange(sanitizeUsername(text));
                  if (errors.username) {
                    clearErrors('username');
                  }
                }}
                onBlur={field.onBlur}
                autoCapitalize="none"
                className="rounded-xl border border-black/10 bg-white px-4 text-black"
                placeholder={t('auth.username')}
              />
            )}
          />
          {errors.username && (
            <Typography className="text-red-500 text-[11px] mt-1 ml-1 leading-4">
              {errors.username.message}
            </Typography>
          )}
        </View>

        <View>
          <Typography className="text-black/60 mb-2">{t('auth.email')}</Typography>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                className="rounded-xl border border-black/10 bg-white px-4 text-black"
                placeholder={t('auth.email')}
              />
            )}
          />
          {errors.email && (
            <Typography className="text-red-500 text-[11px] mt-1 ml-1 leading-4">
              {errors.email.message}
            </Typography>
          )}
        </View>

        <View>
          <Typography className="text-black/60 mb-2">{t('auth.setPassword')}</Typography>
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <View className="rounded-xl border border-black/10 bg-white px-4 flex-row items-center justify-between">
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
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
            )}
          />
          {errors.password && (
            <Typography className="text-red-500 text-[11px] mt-1 ml-1 leading-4">
              {errors.password.message}
            </Typography>
          )}
        </View>

        <View>
          <Typography className="text-black/60 mb-2">{t('auth.confirmPassword')}</Typography>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field }) => (
              <View className="rounded-xl border border-black/10 bg-white px-4 flex-row items-center justify-between">
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  secureTextEntry={!showConfirmPassword}
                  className="flex-1 text-black px-0"
                  placeholder={t('auth.confirmPassword')}
                />
                <Pressable onPress={() => setShowConfirmPassword((prev) => !prev)}>
                  {showConfirmPassword ? (
                    <EyeClosed size={18} color={Palette.grey} />
                  ) : (
                    <Eye size={18} color={Palette.grey} />
                  )}
                </Pressable>
              </View>
            )}
          />
          {errors.confirmPassword && (
            <Typography className="text-red-500 text-[11px] mt-1 ml-1 leading-4">
              {errors.confirmPassword.message}
            </Typography>
          )}
        </View>
      </View>

      <Button
        size="lg"
        rounded="lg"
        className="w-full mt-6"
        onPress={handleSignUp}
        disabled={registerMutation.isPending}
      >
        {registerMutation.isPending ? t('auth.signingUp') : t('auth.signUp')}
      </Button>
    </View>
  );
}
