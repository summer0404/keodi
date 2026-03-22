import { apiClient } from './client';
import { API_ENDPOINTS } from '@/constants/api';
import type { GetNearbyPlacesRequest, GetNearbyPlacesResponse } from '@/types/api';

export const placesService = {
  getNearbyPlaces: async (params: GetNearbyPlacesRequest): Promise<GetNearbyPlacesResponse> => {
    const response = await apiClient.get<GetNearbyPlacesResponse>(API_ENDPOINTS.PLACES_NEAR_ME, {
      params,
    });
    return response.data;
  },
};
