import AlertScreen from '@/components/ui/AlertScreen';
import { authService } from '@/api/auth';
import { extractWaitSeconds } from '@/constants/helper';
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';

export default function CheckEmailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userId } = useLocalSearchParams<{ userId?: string | string[] }>();

  const normalizedUserId = Array.isArray(userId) ? userId[0] : userId;

  const [resendMessage, setResendMessage] = useState('');
  const [resendMessageType, setResendMessageType] = useState<'error' | 'success' | undefined>(
    undefined
  );

  const resendVerifyMutation = useMutation({
    mutationFn: (id: string) => authService.resendVerifyEmail(id),
  });

  const handleResendEmail = async () => {
    if (!normalizedUserId) {
      setResendMessageType('error');
      setResendMessage(t('errors.missingUser') ?? 'Missing user information. Please login again.');
      return;
    }

    setResendMessage('');
    setResendMessageType(undefined);
    try {
      await resendVerifyMutation.mutateAsync(normalizedUserId);
      setResendMessage(t('auth.resendSuccess'));
      setResendMessageType('success');
      setTimeout(() => {
        setResendMessageType(undefined);
        setResendMessage('');
      }, 1800);
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        setResendMessageType('error');
        setResendMessage(t('errors.generic') ?? 'Please try again.');
        return;
      }

      const status = error.response?.status;
      const message = (error.response?.data as { message?: string })?.message;

      if (status === 429) {
        const seconds = extractWaitSeconds(message);
        if (seconds !== null) {
          setResendMessageType('error');
          setResendMessage(t('errors.resendTooManyRequests', { seconds }));
          return;
        }
      }
      setResendMessageType('error');
      setResendMessage(
        message ?? t('errors.unableToResend') ?? 'Unable to resend verification email.'
      );
    }
  };

  return (
    <>
      <AlertScreen
        heading="auth.checkYourEmail"
        description="auth.verificationEmail"
        primaryButtonText="auth.backToLogin"
        primaryButtonAction={() => router.replace('/login')}
        secondaryButtonText="auth.resendEmail"
        secondaryButtonAction={handleResendEmail}
        secondaryButtonMessage={resendMessage}
        secondaryButtonMessageType={resendMessageType}
      />
    </>
  );
}
