import { apiClient } from './client';
import { API_ENDPOINTS } from '@/constants/api';
import type {
  GetNearbyPlacesRequest,
  GetNearbyPlacesResponse,
  GetPlaceReviewsRequest,
  GetPlaceReviewsResponse,
  PlaceItem,
  SearchPlacesRequest,
  SearchPlacesResponse,
  TrendingPlaceItem,
} from '@/types/api';

export const placesService = {
  getNearbyPlaces: async (params: GetNearbyPlacesRequest): Promise<GetNearbyPlacesResponse> => {
    const response = await apiClient.get<GetNearbyPlacesResponse>(API_ENDPOINTS.PLACES_NEAR_ME, {
      params,
    });
    return response.data;
  },
  getPlaceById: async (placeId: string): Promise<PlaceItem> => {
    const response = await apiClient.get<PlaceItem>(`/api/v1/places/${placeId}`);
    return response.data;
  },
  getPlaceReviews: async (
    placeId: string,
    params: GetPlaceReviewsRequest
  ): Promise<GetPlaceReviewsResponse> => {
    const response = await apiClient.get<GetPlaceReviewsResponse>(
      `/api/v1/places/${placeId}/reviews`,
      { params }
    );
    return response.data;
  },
  searchPlaces: async (params: SearchPlacesRequest): Promise<SearchPlacesResponse> => {
    const response = await apiClient.get<SearchPlacesResponse>(API_ENDPOINTS.PLACES_SEARCH, {
      params,
    });
    return response.data;
  },
  getTrendingPlaces: async (): Promise<TrendingPlaceItem[]> => {
    const response = await apiClient.get<TrendingPlaceItem[]>(API_ENDPOINTS.PLACES_TRENDING);
    return response.data;
  },
};
