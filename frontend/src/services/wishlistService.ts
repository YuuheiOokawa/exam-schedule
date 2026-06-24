import { apiClient } from './api';

export const wishlistService = {
  getAll: async (): Promise<number[]> => {
    const res = await apiClient.get<{ success: boolean; data: number[] }>('/wishlist');
    return res.data.data;
  },

  toggle: async (qualificationId: number): Promise<{ added: boolean }> => {
    const res = await apiClient.post<{ success: boolean; data: { added: boolean } }>(
      `/wishlist/${qualificationId}`
    );
    return res.data.data;
  },
};
