export const API_BASE_PATHS = {
  AUTH: '/api/v1/auth',
  CATEGORIES: '/api/v1/categories',
  PLACES: '/api/v1/places',
  FAVORITES: '/api/v1/favorites',
  USERS: '/api/v1/users',
} as const;

export const API_ENDPOINTS = {
  REGISTER: `${API_BASE_PATHS.AUTH}/register`,
  LOGIN: `${API_BASE_PATHS.AUTH}/login`,
  AUTH_ME: `${API_BASE_PATHS.AUTH}/me`,
  RESEND_VERIFY_EMAIL: `${API_BASE_PATHS.AUTH}/resend-verify-email`,
  FORGOT_PASSWORD_OTP: `${API_BASE_PATHS.AUTH}/forgot-password-otp`,
  VALIDATE_FORGOT_PASSWORD_OTP: `${API_BASE_PATHS.AUTH}/validate-forgot-password-otp`,
  RESET_PASSWORD: `${API_BASE_PATHS.AUTH}/reset-password`,
  REFRESH: `${API_BASE_PATHS.AUTH}/refresh`,
  GOOGLE_LOGIN_MOBILE: `${API_BASE_PATHS.AUTH}/google/mobile`,
  PLACES_NEAR_ME: `${API_BASE_PATHS.PLACES}/near-me`,
  FAVORITES: API_BASE_PATHS.FAVORITES,
  ONBOARDING_CATEGORIES: `${API_BASE_PATHS.CATEGORIES}/onboarding`,
  SUBMIT_ONBOARDING: `${API_BASE_PATHS.USERS}/onboarding`,
  UPDATE_USERNAME: `${API_BASE_PATHS.USERS}/username`,
  UPDATE_PICTURE: `${API_BASE_PATHS.USERS}/picture`,
  UPDATE_PROFILE: API_BASE_PATHS.USERS,
} as const;
