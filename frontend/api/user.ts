import { apiClient } from './client';
import { API_ENDPOINTS } from '@/constants/api';
import type {
  UpdatePictureRequest,
  UpdateUserProfileRequest,
  UpdateUserResponse,
  UpdateUsernameRequest,
  UserSettings,
} from '@/types/api';

export const userService = {
  updateUsername: async (payload: UpdateUsernameRequest): Promise<UpdateUserResponse> => {
    const response = await apiClient.patch<UpdateUserResponse>(
      API_ENDPOINTS.UPDATE_USERNAME,
      payload
    );
    return response.data;
  },

  updatePicture: async (payload: UpdatePictureRequest): Promise<UpdateUserResponse> => {
    const formData = new FormData();
    formData.append('picture', {
      uri: payload.uri,
      name: payload.name,
      type: payload.type,
    } as unknown as Blob);

    const response = await apiClient.patch<UpdateUserResponse>(
      API_ENDPOINTS.UPDATE_PICTURE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  updateProfile: async (payload: UpdateUserProfileRequest): Promise<UpdateUserResponse> => {
    const response = await apiClient.patch<UpdateUserResponse>(
      API_ENDPOINTS.UPDATE_PROFILE,
      payload
    );
    return response.data;
  },

  getSetting: async () => {
    const response = await apiClient.get<UserSettings>(API_ENDPOINTS.SETTINGS);
    return response.data;
  },

  updateSetting: async (payload: Partial<UserSettings>): Promise<UserSettings> => {
    const response = await apiClient.patch<UserSettings>(`${API_ENDPOINTS.SETTINGS}`, payload);
    return response.data;
  },
};
