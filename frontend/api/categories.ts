import { apiClient } from './client';
import { API_ENDPOINTS } from '@/constants/api';
import type { CategorySearchResultItem } from '@/types/api';

export const categoriesService = {
  searchCategories: async (q: string, limit: number = 10): Promise<CategorySearchResultItem[]> => {
    const response = await apiClient.get<CategorySearchResultItem[]>(`/api/v1/categories/search`, {
      params: { q, limit },
    });
    return response.data;
  },
};
