export const AuthTopics = {
  Register: 'auth.register',
  Login: 'auth.login',
  Google: 'auth.google',
  ForgotPasswordOtp: 'auth.forgot-password-otp',
  ResetPasswordOtp: 'auth.reset-password-otp',
  ValidateOtp: 'auth.validate-otp',
  ResetPassword: 'auth.reset-password',
  VerifyEmail: 'auth.verify-email',
  ExternalResendVerifyEmail: 'auth.external-resend-verify-email',
  ResendVerifyEmail: 'auth.resend-verify-email',
  Refresh: 'auth.refresh',
} as const;

export const UserTopics = {
  Create: 'user.create',
  Unverify: 'user.unverify',
  UpdateUsername: 'user.update-username',
} as const;

export const NotificationTopics = {
  ForgotPassword: 'notification.forgot-password',
  ResetPassword: 'notification.reset-password',
  VerifyEmail: 'notification.verify-email',
} as const;
