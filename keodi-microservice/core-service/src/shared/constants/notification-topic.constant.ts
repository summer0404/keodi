export const NotificationTopics = {
  Dispatch: 'notification.dispatch',
  PersistInbox: 'notification.persist-inbox',
  RealtimePush: 'notification.realtime.push',
  GetActiveTokens: 'auth.device-token.get-active',
  UpsertToken: 'auth.device-token.upsert',
  DeactivateToken: 'auth.device-token.deactivate',
} as const;

export enum NotificationType {
  GROUP_INVITE = 'GROUP_INVITE',
  GROUP_VOTE_REMINDER = 'GROUP_VOTE_REMINDER',
  GROUP_VOTE_FINALIZED = 'GROUP_VOTE_FINALIZED',
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  FRIEND_ACCEPTED = 'FRIEND_ACCEPTED',
  SYSTEM = 'SYSTEM',
}

export enum NotificationPreferredChannel {
  WEBSOCKET = 'WEBSOCKET',
  FCM = 'FCM',
  BOTH = 'BOTH',
}
