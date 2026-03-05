import { apiClient } from './client';
import { useAuthStore } from '../store/useAuthStore';
import type {
  OnboardingCategory,
  SubmitOnboardingCategoriesRequest,
  SubmitOnboardingCategoriesResponse,
} from '../types/api';
import { API_ENDPOINTS } from '@/constants/api';

export const onboardingService = {
  getCategories: async (): Promise<OnboardingCategory[]> => {
    const response = await apiClient.get<OnboardingCategory[]>(API_ENDPOINTS.ONBOARDING_CATEGORIES);
    return response.data;
  },
  submitCategories: async (
    payload: SubmitOnboardingCategoriesRequest
  ): Promise<SubmitOnboardingCategoriesResponse> => {
    const accessToken = useAuthStore.getState().accessToken;
    const response = await apiClient.patch<SubmitOnboardingCategoriesResponse>(
      API_ENDPOINTS.SUBMIT_ONBOARDING,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  },
};
