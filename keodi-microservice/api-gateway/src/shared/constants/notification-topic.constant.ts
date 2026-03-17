export const NotificationTopics = {
  Dispatch: 'notification.dispatch',
  PersistInbox: 'notification.persist-inbox',
  RealtimePush: 'notification.realtime.push',
  GetActiveTokens: 'auth.device-token.get-active',
  UpsertToken: 'auth.device-token.upsert',
  DeactivateToken: 'auth.device-token.deactivate',
} as const;
