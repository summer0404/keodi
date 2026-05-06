export const RedisKeys = {
  PRESENCE: (userId: string) => `presence:${userId}`,
  CHAT_MEMBERS: (conversationId: string) => `chat:conversation:${conversationId}:members`,
  CHAT_RECENT:  (conversationId: string) => `chat:conversation:${conversationId}:recent`,
} as const;
