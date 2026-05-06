export const NotificationTopics = {
  ForgotPassword: 'notification.forgot-password',
  ResetPassword: 'notification.reset-password',
  VerifyEmail: 'notification.verify-email',
  OwnerApplicationReceived: 'notification.owner-application.received',
  OwnerApplicationApproved: 'notification.owner-application.approved',
  OwnerApplicationRejected: 'notification.owner-application.rejected',
  OwnershipClaimApproved: 'notification.ownership-claim.approved',
  OwnershipClaimRejected: 'notification.ownership-claim.rejected',
  OwnershipRevoked: 'notification.ownership-claim.revoked',
  OwnershipClaimDisputed: 'notification.ownership-claim.disputed',
  Dispatch: 'notification.dispatch',
  PersistInbox: 'notification.persist-inbox',
  RealtimePush: 'notification.realtime.push',
} as const;

export const NotificationInboxTopics = {
  GetInbox: 'notification.inbox.get',
  MarkAsRead: 'notification.inbox.mark-as-read',
  MarkAllAsRead: 'notification.inbox.mark-all-as-read',
  GetUnreadCount: 'notification.inbox.unread-count',
} as const;

export const SettingTopics = {
  Get: 'setting.get',
} as const;

export const DeviceTokenTopics = {
  GetActiveTokens: 'device-token.get-active',
  UpsertToken: 'device-token.upsert',
  DeactivateToken: 'device-token.deactivate',
} as const;

export const ChatTopics = {
  Conversation: {
    Create:  'chat.conversation.create',
    GetById: 'chat.conversation.get-by-id',
    List:    'chat.conversation.list',
    Update:  'chat.conversation.update',
  },
  Message: {
    Send:     'chat.message.send',
    List:     'chat.message.list',
    Delete:   'chat.message.delete',
    MarkRead: 'chat.message.mark-read',
  },
  Member: {
    Add:   'chat.member.add',
    Leave: 'chat.member.leave',
  },
  RealtimePush: 'chat.realtime.push',
} as const;
