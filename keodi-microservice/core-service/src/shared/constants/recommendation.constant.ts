export const RecommendationRedisKeys = {
  PLACES_FROM_SEARCH_TERMS: 'place:search:trending',
  PLACES_FROM_USER_ACTIONS: 'place:user-action:trending',
  GROUP_SESSION_RECOMMENDATIONS: (sessionId: string) => `group-session:${sessionId}:recommendations`,
};

export const PLACES_PER_SEARCH_TERM = 2;

export const TIME_DECAY = 0.05;

export const MAX_RECOMMENDATIONS_BOUNDING_KM = 5

export const MAX_CANDINDATE_PLACES = 20;
