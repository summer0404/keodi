export const RedisKeys = {
  USER_LOCATIONS: 'user:locations',
  SEARCH: {
    TRENDING: 'search:trending',
  },
  RECOMMENDATION: {
    PLACES_FROM_SEARCH_TERMS: 'place:search:trending',
    PLACES_FROM_USER_ACTIONS: 'place:user-action:trending',
    GROUP_SESSION_RECOMMENDATIONS: (sessionId: string) =>
      `group-session:${sessionId}:recommendations`,
  },
  GROUP_SESSION: {
    MEMBER_LOCATION: (sessionId: string, userId: string) =>
      `session:${sessionId}:location:${userId}`,
    MEMBER_VOTES: (sessionId: string) => `group-session:${sessionId}:member-votes`,
  },
} as const;
