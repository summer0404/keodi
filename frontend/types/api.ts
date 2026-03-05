export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface ResendVerifyEmailResponse {
  message?: string;
}

export interface ForgotPasswordOtpRequest {
  email: string;
}

export interface ForgotPasswordOtpResponse {
  userId: string;
}

export interface ValidateForgotPasswordOtpRequest {
  userId: string;
  otp: string;
}

export interface ValidateForgotPasswordOtpResponse {
  resetToken: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface ResetPasswordResponse {
  message?: string;
}

export interface OnboardingCategory {
  id: string;
  name: string;
  isSelectable: boolean;
}

export interface SubmitOnboardingCategoriesRequest {
  categoryIds: string[];
}

export interface SubmitOnboardingCategoriesResponse {
  message?: string;
}
