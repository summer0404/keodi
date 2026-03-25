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
