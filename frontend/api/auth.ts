import { apiClient } from './client';
import type {
  ForgotPasswordOtpRequest,
  ForgotPasswordOtpResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ResendVerifyEmailResponse,
  ValidateForgotPasswordOtpRequest,
  ValidateForgotPasswordOtpResponse,
} from '../types/api';

export const authService = {
  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>('/api/v1/auth/register', payload);
    return response.data;
  },
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', payload);
    return response.data;
  },
  resendVerifyEmail: async (userId: string): Promise<ResendVerifyEmailResponse> => {
    const response = await apiClient.get<ResendVerifyEmailResponse>(
      `/api/v1/auth/resend-verify-email/${userId}`
    );
    return response.data;
  },
  forgotPasswordOtp: async (
    payload: ForgotPasswordOtpRequest
  ): Promise<ForgotPasswordOtpResponse> => {
    const response = await apiClient.post<ForgotPasswordOtpResponse>(
      '/api/v1/auth/forgot-password-otp',
      payload
    );
    return response.data;
  },
  validateForgotPasswordOtp: async (
    payload: ValidateForgotPasswordOtpRequest
  ): Promise<ValidateForgotPasswordOtpResponse> => {
    const response = await apiClient.post<ValidateForgotPasswordOtpResponse>(
      '/api/v1/auth/validate-forgot-password-otp',
      payload
    );
    return response.data;
  },
  resetPassword: async (
    payload: ResetPasswordRequest,
    resetToken: string
  ): Promise<ResetPasswordResponse> => {
    const response = await apiClient.post<ResetPasswordResponse>(
      '/api/v1/auth/reset-password',
      payload,
      {
        headers: {
          Authorization: `Bearer ${resetToken}`,
        },
      }
    );
    return response.data;
  },
};
