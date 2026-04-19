export const AuthTopics = {
  Register: 'auth.register',
  RegisterOwner: 'auth.register-owner',
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
  ApproveOwner: 'auth.approve-owner',
  RejectOwner: 'auth.reject-owner',
} as const;

export const UserTopics = {
  Create: 'user.create',
  Unverify: 'user.unverify',
  UpdateUsername: 'user.update-username',
  UsernameSynced: 'user.username-synced',
} as const;

export const OwnerApplicationTopics = {
  Create: 'owner-application.create',
} as const;

export const NotificationTopics = {
  ForgotPassword: 'notification.forgot-password',
  ResetPassword: 'notification.reset-password',
  VerifyEmail: 'notification.verify-email',
  OwnerApplicationReceived: 'notification.owner-application.received',
  OwnerApplicationApproved: 'notification.owner-application.approved',
  OwnerApplicationRejected: 'notification.owner-application.rejected',
} as const;
