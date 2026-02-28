import { apiClient } from './client';
import { useAuthStore } from '../store/useAuthStore';
import type {
  OnboardingCategory,
  SubmitOnboardingCategoriesRequest,
  SubmitOnboardingCategoriesResponse,
} from '../types/api';

export const onboardingService = {
  getCategories: async (): Promise<OnboardingCategory[]> => {
    const response = await apiClient.get<OnboardingCategory[]>('/api/v1/categories/onboarding');
    return response.data;
  },
  submitCategories: async (
    payload: SubmitOnboardingCategoriesRequest
  ): Promise<SubmitOnboardingCategoriesResponse> => {
    const accessToken = useAuthStore.getState().accessToken;
    const response = await apiClient.patch<SubmitOnboardingCategoriesResponse>(
      '/api/v1/users/onboarding',
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
