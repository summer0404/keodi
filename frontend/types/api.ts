export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message?: string;
  userId?: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ResendVerifyEmailResponse {
  message?: string;
}

export interface ForgotPasswordOtpRequest {
  email: string;
}

export interface ForgotPasswordOtpResponse {
  userId: string;
}

export interface ValidateForgotPasswordOtpRequest {
  userId: string;
  otp: string;
}

export interface ValidateForgotPasswordOtpResponse {
  resetToken: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface ResetPasswordResponse {
  message?: string;
}

export interface AuthMeResponse {
  id: string;
  username: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  pictureUrl: string | null;
  dateOfBirth: string | null;
  phoneNumber: string | null;
}

export interface UpdateUsernameRequest {
  username: string;
}

export interface UpdatePictureRequest {
  uri: string;
  name: string;
  type: string;
}

export interface UpdateUserProfileRequest {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
}

export interface UpdateUserResponse {
  message?: string;
}

export type PlaceSortBy = 'distance' | 'rating' | 'name' | 'createdAt';

export interface GetNearbyPlacesRequest {
  page: number;
  limit: number;
  sortBy: PlaceSortBy;
  sortOrder?: 'asc' | 'desc';
  latitude: number;
  longitude: number;
  radius: number;
}

export interface PlaceOpeningHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

export interface PlaceCategory {
  id: string;
  name: string;
  isMain: boolean;
}

export interface PlaceItem {
  id: string;
  fromGoogle: boolean;
  name: string;
  description: string | null;
  rating: number;
  googleMapLink: string | null;
  website: string | null;
  phoneNumber: string | null;
  featureImageUrl: string | null;
  ownerId: string | null;
  latitude: number;
  longitude: number;
  fullAddress: string | null;
  ward: string | null;
  street: string | null;
  city: string | null;
  countryCode: string | null;
  createdAt: string;
  updatedAt: string;
  distance?: number;
  has_attributes: number;
  isFavorite: boolean;
  openingHours?: PlaceOpeningHour[];
  categories?: PlaceCategory[];
}

export interface GetNearbyPlacesResponse {
  places: PlaceItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface GetFavoritesRequest {
  page: number;
  limit: number;
  sortBy: PlaceSortBy;
  sortOrder?: 'asc' | 'desc';
}

export type FavoriteItem = Omit<PlaceItem, 'distance' | 'has_attributes' | 'isFavorite'> & {
  distance?: number;
};

export interface GetFavoritesResponse {
  favorites: FavoriteItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface AddFavoriteResponse {
  userId: string;
  placeId: string;
  createdAt: string;
}

export interface OnboardingCategory {
  id: string;
  name: string;
  isSelectable: boolean;
}

export interface SubmitOnboardingCategoriesRequest {
  categoryIds: string[];
}

export interface SubmitOnboardingCategoriesResponse {
  message?: string;
}

export interface Review {
  id: string;
  placeId: string;
  userId: string | null;
  fromGoogle: boolean;
  reviewerName: string;
  reviewerPicture: string | null;
  rating: number;
  text: string | null;
  originalLanguage: string | null;
  sentimentAnalyzed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetPlaceReviewsRequest {
  page: number;
  limit: number;
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface GetPlaceReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
}

export interface TrendingPlaceItem {
  id: string;
  name: string;
  description: string | null;
  rating: number;
  googleMapLink: string | null;
  website: string | null;
  phoneNumber: string | null;
  featureImageUrl: string | null;
  latitude: number;
  longitude: number;
  fullAddress: string | null;
  openingHours?: PlaceOpeningHour[];
  categories?: PlaceCategory[];
}

export interface SearchPlacesRequest {
  latitude: number;
  longitude: number;
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  sortBy?: PlaceSortBy;
  radius?: number;
  search: string;
  mode?: string;
}

export interface SearchPlacesResponse {
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  places: PlaceItem[];
}

export type SortOrder = 'asc' | 'desc';

export interface GroupSessionUserSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  pictureUrl: string | null;
}

export interface GroupSessionMember {
  id: string;
  sessionId: string;
  userId: string | null;
  guestId: string | null;
  nickname: string | null;
  joinedAt: string;
  user: GroupSessionUserSummary | null;
}

export interface GroupSessionItem {
  sessionId: string;
  createdBy: string;
  shareCode: string;
  createdAt: string;
  searchRadius?: number;
  status: string;
  voteStatus: string;
  finalizedAt: string | null;
  closeAt?: string | null;
  winningPlaceId: string | null;
  creator?: GroupSessionUserSummary | null;
  members?: GroupSessionMember[];
  winningPlace?: PlaceItem | null;
}

export interface GetGroupSessionsResponse {
  sessions: GroupSessionItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface CreateGroupSessionResponse {
  sessionId: string;
  createdBy: string;
  shareCode: string;
  createdAt: string;
  status: string;
  voteStatus: string;
  finalizedAt: string | null;
  winningPlaceId: string | null;
}

export interface GetFriendsRequest {
  page: number;
  limit: number;
  sortOrder: SortOrder;
  sortBy: 'createdAt' | 'firstName' | 'lastName';
}

export interface FriendUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  pictureUrl: string | null;
}

export interface FriendItem {
  id: string;
  userId: string;
  friendId: string;
  createdAt: string;
  friend: FriendUser;
}

export interface GetFriendsResponse {
  friends: FriendItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface JoinGroupSessionRequest {
  shareCode: string;
  nickname?: string;
  guestId?: string;
}

export interface JoinGroupSessionResponse extends GroupSessionItem {
  memberCount?: number;
  member?: GroupSessionMember | null;
  alreadyJoined?: boolean;
}

export interface InviteFriendResponse {
  sessionId: string;
  shareCode: string;
  inviterId: string;
  friendId: string;
}

export interface GroupSessionCandidateUserSummary {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  pictureUrl: string | null;
}

export interface GroupSessionCandidateMember {
  id: string;
  userId: string | null;
  guestId: string | null;
  nickname: string | null;
  user: GroupSessionCandidateUserSummary | null;
}

export interface GroupSessionCandidateItem {
  sessionId: string;
  placeId: string;
  addedBy: string;
  createdAt: string;
  place: {
    id: string;
    name: string;
    featureImageUrl: string | null;
    rating: number;
    fullAddress: string | null;
    ward: string | null;
    street: string | null;
    city: string | null;
    countryCode: string | null;
  };
  member: GroupSessionCandidateMember | null;
}

export interface GetGroupCandidatesResponse {
  sessionId: string;
  candidates: GroupSessionCandidateItem[];
  total: number;
}

export interface DeleteGroupCandidateResponse {
  sessionId: string;
  placeId: string;
}

export interface VotePlaceSessionRequest {
  guestId?: string;
  placeId: string;
}

export interface VotePlaceSessionResponse {
  id: string;
  sessionId: string;
  memberId: string;
  placeId: string;
  isFinalized: boolean;
  createdAt: string;
  updatedAt: string;
  place?: {
    id: string;
    name: string;
    featureImageUrl: string | null;
    rating: number;
    fullAddress: string | null;
    ward: string | null;
    street: string | null;
    city: string | null;
    countryCode: string | null;
  };
  member?: {
    id: string;
    userId: string | null;
    guestId: string | null;
    nickname: string | null;
  };
}

export interface FinalizeMemberVoteRequest {
  guestId?: string;
}

export interface FinalizeMemberVoteResponse {
  vote: VotePlaceSessionResponse;
  voteAutoFinalized: boolean;
}

export interface FinalizeSessionVoteResponse {
  sessionId: string;
  voteStatus: string;
  totalMembers: number;
  totalVotes: number;
  winningPlaceId: string | null;
  results: GroupVoteResult[];
}

export interface GroupVoteMember {
  id: string;
  userId: string | null;
  guestId: string | null;
  nickname: string | null;
  user?: GroupSessionUserSummary | null;
}

export interface GroupVoteDetail {
  id: string;
  sessionId: string;
  memberId: string;
  placeId: string;
  isFinalized: boolean;
  createdAt: string;
  updatedAt: string;
  place: {
    id: string;
    name: string;
    featureImageUrl: string | null;
    rating: number;
    fullAddress: string | null;
    ward: string | null;
    street: string | null;
    city: string | null;
    countryCode: string | null;
  };
  member: GroupVoteMember;
}

export interface GroupVoteResult {
  place: {
    id: string;
    name: string;
    featureImageUrl: string | null;
    rating: number;
    fullAddress: string | null;
    ward: string | null;
    street: string | null;
    city: string | null;
    countryCode: string | null;
  };
  count: number;
  voters: GroupVoteMember[];
}

export interface GroupVoteItem {
  sessionId: string;
  voteStatus: string;
  totalMembers: number;
  totalVotes: number;
  finalizedCount: number;
  votes: GroupVoteDetail[];
  results: GroupVoteResult[];
}

export interface PlaceOpeningHours {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
}

export interface PlaceCategory {
  id: string;
  name: string;
  isMain: boolean;
}

export interface PlaceRecommendationItem {
  id: string;
  name: string;
  description: string | null;
  rating: number;
  googleMapLink: string | null;
  website: string | null;
  phoneNumber: string | null;
  featureImageUrl: string | null;
  latitude: number;
  longitude: number;
  fullAddress: string | null;
  openingHours: PlaceOpeningHours[];
  categories: PlaceCategory[];
}

export interface UpdateGroupRecommendationCategoriesRequest {
  guestId?: string;
  categoryIds: string[];
}

export interface UpdateGroupRecommendationCategoriesResponse {
  message?: string;
}

export interface UpdateGroupRecommendationRadiusRequest {
  guestId?: string;
  searchRadius: number;
}

export interface UpdateGroupRecommendationRadiusResponse {
  message?: string;
}

export type RealtimeLocationSnapshot = {
  sessionId?: string;
  locations?: Array<{
    userId?: string;
    latitude?: number;
    longitude?: number;
    timestamp?: number;
  }>;
};

export type RealtimeLocationUpdated = {
  userId?: string;
  latitude?: number;
  longitude?: number;
  timestamp?: number;
};

export type RealtimeLocationOffline = {
  userId?: string;
};

export type MemberLocation = {
  memberId?: string;
  latitude: number;
  longitude: number;
};

export interface PlaceCandidateResponse {
  sessionId: string;
  placeId: string;
  addedBy: string;
  createdAt: string;
  place: {
    id: string;
    name: string;
    featureImageUrl: string | null;
    rating: number;
    fullAddress: string | null;
    ward: string | null;
    street: string | null;
    city: string | null;
    countryCode: string | null;
  };
}

export interface UserSettings {
  shareLocation: boolean;
  profileVisibility: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
  notifyGroupInvites: boolean;
  notifyVotingResults: boolean;
  notifyNearbyPlaces: boolean;
  notifyRecommendations: boolean;
  defaultSearchRadius: 'KM_2' | 'KM_5' | 'KM_10' | 'KM_20';
  defaultMinRating: 'ABOVE_1' | 'ABOVE_2' | 'ABOVE_3' | 'ABOVE_4' | 'FIVE_STAR';
  language: 'VI' | 'EN';
  darkMode: boolean;
}

export interface CategorySearchResultItem {
  id: string;
  name: string;
  placeCount: number;
  score: number;
}
