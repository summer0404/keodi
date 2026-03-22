import { API_ENDPOINTS } from '@/constants/api';
import type { AddFavoriteResponse, GetFavoritesRequest, GetFavoritesResponse } from '@/types/api';
import { apiClient } from './client';

export const favoriteService = {
  addFavorite: async (placeId: string): Promise<AddFavoriteResponse> => {
    const encodedPlaceId = encodeURIComponent(placeId);
    const response = await apiClient.post<AddFavoriteResponse>(
      `${API_ENDPOINTS.FAVORITES}/${encodedPlaceId}`
    );
    return response.data;
  },

  removeFavorite: async (placeId: string): Promise<void> => {
    const encodedPlaceId = encodeURIComponent(placeId);
    await apiClient.delete(`${API_ENDPOINTS.FAVORITES}/${encodedPlaceId}`);
  },

  getFavorites: async (params: GetFavoritesRequest): Promise<GetFavoritesResponse> => {
    const response = await apiClient.get<GetFavoritesResponse>(API_ENDPOINTS.FAVORITES, {
      params,
    });
    return response.data;
  },
};
