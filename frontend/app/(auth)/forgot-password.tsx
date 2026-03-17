import { Button } from '@/components/ui/Button';
import Typography from '@/components/ui/Typography';
import { authService } from '@/api/auth';
import { extractWaitSeconds } from '@/constants/helper';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isOtpModalVisible, setIsOtpModalVisible] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const otpInputRefs = useRef<Array<TextInput | null>>([]);

  const forgotPasswordMutation = useMutation({
    mutationFn: authService.forgotPasswordOtp,
  });

  const validateForgotPasswordOtpMutation = useMutation({
    mutationFn: authService.validateForgotPasswordOtp,
  });

  useEffect(() => {
    if (!isOtpModalVisible) {
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      setKeyboardHeight(0);
    };
  }, [isOtpModalVisible]);

  const handleCloseOtpModal = () => {
    setIsOtpModalVisible(false);
    setOtpError('');
    setKeyboardHeight(0);
  };

  const handleOtpModalShow = () => {
    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 150);
  };

  const handleOtpChange = (index: number, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    if (!sanitized) {
      const nextDigits = [...otpDigits];
      nextDigits[index] = '';
      setOtpDigits(nextDigits);
      if (otpError) {
        setOtpError('');
      }
      return;
    }

    const nextDigits = [...otpDigits];

    if (sanitized.length > 1) {
      const spreadDigits = sanitized.slice(0, 6).split('');
      for (let offset = 0; offset < spreadDigits.length && index + offset < 6; offset += 1) {
        nextDigits[index + offset] = spreadDigits[offset];
      }
      setOtpDigits(nextDigits);

      const nextFocusIndex = Math.min(index + spreadDigits.length, 5);
      otpInputRefs.current[nextFocusIndex]?.focus();
    } else {
      nextDigits[index] = sanitized;
      setOtpDigits(nextDigits);

      if (index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      }
    }

    if (otpError) {
      setOtpError('');
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key !== 'Backspace') {
      return;
    }

    if (otpDigits[index] === '' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const validate = () => {
    setEmailError('');
    setRequestError('');

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setEmailError(t('errors.emailRequired'));
      return false;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!isValidEmail) {
      setEmailError(t('errors.emailInvalid'));
      return false;
    }

    return true;
  };

  const handleSendResetOTP = async () => {
    if (!validate()) {
      return;
    }

    try {
      const result = await forgotPasswordMutation.mutateAsync({ email: email.trim() });
      setUserId(result.userId);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError('');
      setIsOtpModalVisible(true);
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        Alert.alert('Error', 'Please try again.');
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

      if (message) {
        setRequestError(message);
        return;
      }

      Alert.alert('Error', 'Please try again.');
    }
  };

  const handleValidateOtp = async () => {
    setOtpError('');
    const normalizedOtp = otpDigits.join('');

    if (!normalizedOtp) {
      setOtpError(t('errors.otpRequired'));
      return;
    }

    if (!/^\d{6}$/.test(normalizedOtp)) {
      setOtpError(t('errors.otpInvalidMin'));
      return;
    }

    if (!userId) {
      setOtpError(t('errors.unexpectedError'));
      return;
    }

    try {
      const result = await validateForgotPasswordOtpMutation.mutateAsync({
        userId,
        otp: normalizedOtp,
      });
      handleCloseOtpModal();
      router.push({
        pathname: '/new-password',
        params: { resetToken: result.resetToken },
      });
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        setOtpError(t('errors.unexpectedError'));
        return;
      }

      const status = error.response?.status;
      const message = (error.response?.data as { message?: string })?.message;

      if (status === 429) {
        const seconds = extractWaitSeconds(message);
        if (seconds !== null) {
          setOtpError(t('errors.otpTooManyRequests', { seconds }));
          return;
        }

        setOtpError(t('errors.tooManyRequests'));
        return;
      }

      if (status === 401 && message === 'Invalid OTP') {
        setOtpError(t('errors.otpInvalid'));
        return;
      }

      if (message) {
        setOtpError(message);
        return;
      }

      setOtpError(t('errors.unexpectedError'));
    }
  };

  return (
    <View>
      <Typography variant="h3" className="text-black text-center">
        {t('auth.forgotPassword')}
      </Typography>
      <Typography className="text-black/60 text-center mt-2 mb-8">
        {t('auth.forgotPasswordDescription')}
      </Typography>

      <Typography className="text-black/60 mb-2">{t('auth.email')}</Typography>
      <TextInput
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (emailError) {
            setEmailError('');
          }
          if (requestError) {
            setRequestError('');
          }
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
        className="rounded-xl border border-black/10 bg-white px-4 py-3 text-black"
      />
      {!!emailError && (
        <Typography className="text-red-500 text-[11px] mt-1 ml-1 leading-4">
          {emailError}
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
        onPress={handleSendResetOTP}
        disabled={forgotPasswordMutation.isPending}
      >
        {forgotPasswordMutation.isPending ? 'Loading...' : t('auth.sendResetLink')}
      </Button>

      <Pressable className="mt-6 items-center" onPress={() => router.replace('/login')}>
        <Typography className="text-gray-500">{t('auth.backToLogin')}</Typography>
      </Pressable>

      <Modal
        visible={isOtpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseOtpModal}
        onShow={handleOtpModalShow}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableWithoutFeedback onPress={handleCloseOtpModal}>
            <View className="absolute inset-0" />
          </TouchableWithoutFeedback>

          <View
            className="bg-white w-full rounded-t-[24px] px-4 pt-3"
            style={{
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 16 : Math.max(insets.bottom, 16),
            }}
          >
            <View className="items-center mb-3">
              <View className="w-10 h-1 bg-gray-300 rounded-full" />
            </View>

            <Typography variant="h4" className="text-center">
              {t('auth.enterOtp')}
            </Typography>
            <Typography className="text-black/60 text-center mt-2 mb-5">
              {t('auth.enterOtpDescription')}
            </Typography>

            <View className="flex-row justify-between gap-2 mb-2">
              {otpDigits.map((digit, index) => (
                <TextInput
                  key={`otp-${index}`}
                  ref={(ref) => {
                    otpInputRefs.current[index] = ref;
                  }}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(index, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  className="h-12 flex-1 rounded-xl border border-black/10 bg-white text-black"
                />
              ))}
            </View>

            {!!otpError && (
              <Typography className="text-red-500 text-[11px] mt-2 ml-1 leading-4">
                {otpError}
              </Typography>
            )}

            <Button
              rounded="lg"
              size="lg"
              className="w-full mt-5"
              onPress={handleValidateOtp}
              disabled={validateForgotPasswordOtpMutation.isPending}
            >
              {validateForgotPasswordOtpMutation.isPending ? 'Loading...' : t('auth.verifyOtp')}
            </Button>

            <Button
              variant="ghost"
              className="w-full mt-2"
              onPress={handleCloseOtpModal}
              disabled={validateForgotPasswordOtpMutation.isPending}
            >
              {t('auth.cancel')}
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}
