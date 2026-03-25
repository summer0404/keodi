import { apiClient } from './client';
import { API_ENDPOINTS } from '@/constants/api';
import type {
  GetNearbyPlacesRequest,
  GetNearbyPlacesResponse,
  GetPlaceReviewsRequest,
  GetPlaceReviewsResponse,
  PlaceItem,
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
};
