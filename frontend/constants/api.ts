export const API_BASE_PATHS = {
  AUTH: '/api/v1/auth',
  CATEGORIES: '/api/v1/categories',
  USERS: '/api/v1/users',
} as const;

export const API_ENDPOINTS = {
  REGISTER: `${API_BASE_PATHS.AUTH}/register`,
  LOGIN: `${API_BASE_PATHS.AUTH}/login`,
  RESEND_VERIFY_EMAIL: `${API_BASE_PATHS.AUTH}/resend-verify-email`,
  FORGOT_PASSWORD_OTP: `${API_BASE_PATHS.AUTH}/forgot-password-otp`,
  VALIDATE_FORGOT_PASSWORD_OTP: `${API_BASE_PATHS.AUTH}/validate-forgot-password-otp`,
  RESET_PASSWORD: `${API_BASE_PATHS.AUTH}/reset-password`,
  REFRESH: `${API_BASE_PATHS.AUTH}/refresh`,
  ONBOARDING_CATEGORIES: `${API_BASE_PATHS.CATEGORIES}/onboarding`,
  SUBMIT_ONBOARDING: `${API_BASE_PATHS.USERS}/onboarding`,
} as const;
