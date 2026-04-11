import { API_ENDPOINTS } from '@/constants/api';
import type { GetFriendsRequest, GetFriendsResponse } from '@/types/api';
import { apiClient } from './client';

export const friendsService = {
  getFriends: async (params: GetFriendsRequest): Promise<GetFriendsResponse> => {
    const response = await apiClient.get<GetFriendsResponse>(API_ENDPOINTS.FRIENDS, {
      params,
    });
    return response.data;
  },
};
