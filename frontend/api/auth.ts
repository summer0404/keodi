import { apiClient } from './client';
import type {
  AuthMeResponse,
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
import { API_ENDPOINTS } from '@/constants/api';

export const authService = {
  getMe: async (): Promise<AuthMeResponse> => {
    const response = await apiClient.get<AuthMeResponse>(API_ENDPOINTS.AUTH_ME);
    return response.data;
  },
  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>(API_ENDPOINTS.REGISTER, payload);
    return response.data;
  },
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.LOGIN, payload);
    return response.data;
  },
  googleLoginMobile: async (token: string): Promise<{ accessToken: string }> => {
    const response = await apiClient.post<{ accessToken: string }>(
      API_ENDPOINTS.GOOGLE_LOGIN_MOBILE,
      { token }
    );
    return response.data;
  },
  resendVerifyEmail: async (userId: string): Promise<ResendVerifyEmailResponse> => {
    const response = await apiClient.get<ResendVerifyEmailResponse>(
      `${API_ENDPOINTS.RESEND_VERIFY_EMAIL}/${userId}`
    );
    return response.data;
  },
  forgotPasswordOtp: async (
    payload: ForgotPasswordOtpRequest
  ): Promise<ForgotPasswordOtpResponse> => {
    const response = await apiClient.post<ForgotPasswordOtpResponse>(
      API_ENDPOINTS.FORGOT_PASSWORD_OTP,
      payload
    );
    return response.data;
  },
  validateForgotPasswordOtp: async (
    payload: ValidateForgotPasswordOtpRequest
  ): Promise<ValidateForgotPasswordOtpResponse> => {
    const response = await apiClient.post<ValidateForgotPasswordOtpResponse>(
      API_ENDPOINTS.VALIDATE_FORGOT_PASSWORD_OTP,
      payload
    );
    return response.data;
  },
  resetPassword: async (
    payload: ResetPasswordRequest,
    resetToken: string
  ): Promise<ResetPasswordResponse> => {
    const response = await apiClient.post<ResetPasswordResponse>(
      API_ENDPOINTS.RESET_PASSWORD,
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
