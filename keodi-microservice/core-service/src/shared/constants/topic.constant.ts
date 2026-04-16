export const UserTopics = {
  Create: 'user.create',
  Get: 'user.get',
  GetAll: 'user.get-all',
  UpdatePicture: 'user.update-picture',
  UpdateProfile: 'user.update-profile',
  UpdateLocation: 'user.update-location',
  Onboarding: 'user.onboarding',
  GetOtherProfile: 'user.get-other-profile',
  UsernameSynced: 'user.username-synced',
} as const;

export const PlaceTopics = {
  GetById: 'place.get-by-id',
  NearMe: 'place.near-me',
  Search: 'place.search',
} as const;

export const RecommendationTopics = {
  Trending: 'recommendation.trending',
  ForYou: 'recommendation.for-you',
  GroupSessionGetRecommendations:
    'recommendation.group-session.get-recommendations',
  GroupSessionInvalidateCache:
    'recommendation.group-session.invalidate-cache',
} as const;

export const FavoriteTopics = {
  Add: 'favorite.add',
  Remove: 'favorite.remove',
  GetList: 'favorite.get-list',
  Check: 'favorite.check',
} as const;

export const CategoryTopics = {
  GetListOnboarding: 'category.get-list-onboarding',
} as const;

export const FriendTopics = {
  SendRequest: 'friend.send-request',
  AcceptRequest: 'friend.accept-request',
  RejectRequest: 'friend.reject-request',
  CancelRequest: 'friend.cancel-request',
  RemoveFriend: 'friend.remove-friend',
  GetFriends: 'friend.get-friends',
  GetPendingRequests: 'friend.get-pending-requests',
} as const;

export const GroupSessionTopics = {
  Create: 'group-session.create',
  Join: 'group-session.join',
  InviteFriend: 'group-session.invite-friend',
  Close: 'group-session.close',
  CastVote: 'group-session.cast-vote',
  FinalizeMemberVote: 'group-session.finalize-member-vote',
  FinalizeSessionVote: 'group-session.finalize-session-vote',
  GetVotes: 'group-session.get-votes',
  GetSession: 'group-session.get-session',
  GetAll: 'group-session.get-all',
} as const;

export const SearchTopics = {
  Create: 'search.create',
  Trending: 'search.trending',
  UpdateTrendingForRedis: 'search.update-trending-for-redis',
} as const;

export const SettingTopics = {
  Get: 'setting.get',
  Update: 'setting.update',
} as const;

export const AttributeTopics = {
  Create: 'attribute.create',
} as const;

export const ReviewTopics = {
  Create: 'review.create',
  GetByPlaceId: 'review.get_by_place_id',
} as const;

export const IntelligenceTopics = {
  ExtractUserIntent: 'intelligence.extract-user-intent',
  Ranking: 'intelligence.ranking',
  SentimentAnalysis: 'intelligence.sentiment-analysis',
  TrainRankingModel: 'intelligence.train-ranking-model',
} as const;

export const NotificationTopics = {
  Dispatch: 'notification.dispatch',
  PersistInbox: 'notification.persist-inbox',
  RealtimePush: 'notification.realtime.push',
  GetActiveTokens: 'device-token.get-active',
  UpsertToken: 'device-token.upsert',
  DeactivateToken: 'device-token.deactivate',
} as const;
