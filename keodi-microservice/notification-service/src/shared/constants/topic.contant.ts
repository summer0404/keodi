export const NotificationTopics = {
    ForgotPassword: 'notification.forgot-password',
    ResetPassword: 'notification.reset-password',
    VerifyEmail: 'notification.verify-email',
    Dispatch: 'notification.dispatch',
    PersistInbox: 'notification.persist-inbox',
    RealtimePush: 'notification.realtime.push',
} as const;


export const SettingTopics = {
    Get: 'setting.get',
} as const;


export const DeviceTokenTopics = {
    GetActiveTokens: 'device-token.get-active',
    UpsertToken: 'device-token.upsert',
    DeactivateToken: 'device-token.deactivate',
} as const;