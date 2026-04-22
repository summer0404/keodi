export const RedisKeys = {
  PRESENCE: (userId: string) => `presence:${userId}`,
} as const;
