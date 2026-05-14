import { API_ENDPOINTS } from '@/constants/api';
import type {
  GetFriendsRequest,
  GetFriendsResponse,
  SearchUsersRequest,
  SearchUsersResponse,
  SendFriendRequestRequest,
  FriendRequestItem,
  GenericSuccessResponse,
  GetPendingRequestsRequest,
  GetPendingRequestsResponse,
} from '@/types/api';
import { apiClient } from './client';

export const friendsService = {
  getFriends: async (params: GetFriendsRequest): Promise<GetFriendsResponse> => {
    const response = await apiClient.get<GetFriendsResponse>(API_ENDPOINTS.FRIENDS, {
      params,
    });
    return response.data;
  },

  searchUsers: async (params: SearchUsersRequest): Promise<SearchUsersResponse> => {
    const response = await apiClient.get<SearchUsersResponse>(API_ENDPOINTS.USERS_SEARCH, {
      params,
    });
    return response.data;
  },

  sendFriendRequest: async (data: SendFriendRequestRequest): Promise<FriendRequestItem> => {
    const response = await apiClient.post<FriendRequestItem>(API_ENDPOINTS.FRIENDS_REQUEST, data);
    return response.data;
  },

  acceptFriendRequest: async (requestId: string): Promise<GenericSuccessResponse> => {
    const response = await apiClient.post<GenericSuccessResponse>(
      `${API_ENDPOINTS.FRIENDS_REQUEST}/${requestId}/accept`
    );
    return response.data;
  },

  rejectFriendRequest: async (requestId: string): Promise<GenericSuccessResponse> => {
    const response = await apiClient.post<GenericSuccessResponse>(
      `${API_ENDPOINTS.FRIENDS_REQUEST}/${requestId}/reject`
    );
    return response.data;
  },

  cancelFriendRequest: async (requestId: string): Promise<GenericSuccessResponse> => {
    const response = await apiClient.post<GenericSuccessResponse>(
      `${API_ENDPOINTS.FRIENDS_REQUEST}/${requestId}/cancel`
    );
    return response.data;
  },

  getPendingRequests: async (
    params: GetPendingRequestsRequest
  ): Promise<GetPendingRequestsResponse> => {
    const response = await apiClient.get<GetPendingRequestsResponse>(
      API_ENDPOINTS.FRIENDS_REQUESTS_PENDING,
      { params }
    );
    return response.data;
  },

  deleteFriend: async (friendId: string): Promise<GenericSuccessResponse> => {
    const response = await apiClient.delete<GenericSuccessResponse>(
      `${API_ENDPOINTS.FRIENDS}/${friendId}`
    );
    return response.data;
  },
};
