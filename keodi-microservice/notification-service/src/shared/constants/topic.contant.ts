export const NotificationTopics = {
    ForgotPassword: 'notification.forgot-password',
    ResetPassword: 'notification.reset-password',
    VerifyEmail: 'notification.verify-email',
    OwnerApplicationReceived: 'notification.owner-application.received',
    OwnerApplicationApproved: 'notification.owner-application.approved',
    OwnerApplicationRejected: 'notification.owner-application.rejected',
    OwnershipClaimApproved: 'notification.ownership-claim.approved',
    OwnershipClaimRejected: 'notification.ownership-claim.rejected',
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
