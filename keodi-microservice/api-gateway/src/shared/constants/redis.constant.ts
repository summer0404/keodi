export const RedisKeys = {
  SEARCH: {
    TRENDING: 'search:trending',
  },
  RECOMMENDATION: {
    FOR_YOU: (userId: string) => `place:foryou:${userId}`,
    TRENDING: (userId: string) => `place:trending:${userId}`,
    GROUP_SESSION_RECOMMENDATIONS: (sessionId: string) =>
      `group-session:${sessionId}:recommendations`,
  },
  PRESENCE: (userId: string) => `presence:${userId}`,
  SESSION_MEMBER_LOCATION: (sessionId: string, userId: string) =>
    `session:${sessionId}:location:${userId}`,
  SESSION_MEMBER_LOCATION_PATTERN: (sessionId: string) =>
    `session:${sessionId}:location:*`,
} as const;
