import { apiClient } from './api';
import type { ApiSuccess } from '@/types/api';

export interface HeldDetail {
  qualification_id: number;
  score: string | null;
  acquired_at: string | null;
}

export const heldService = {
  getAll: async (): Promise<number[]> => {
    const res = await apiClient.get<ApiSuccess<number[]>>('/held');
    return res.data.data;
  },

  getDetails: async (): Promise<HeldDetail[]> => {
    const res = await apiClient.get<ApiSuccess<HeldDetail[]>>('/held/details');
    return res.data.data;
  },

  toggle: async (qualificationId: number): Promise<{ held: boolean }> => {
    const res = await apiClient.post<ApiSuccess<{ held: boolean }>>(`/held/${qualificationId}`);
    return res.data.data;
  },

  sync: async (ids: number[]): Promise<void> => {
    await apiClient.put('/held/sync', { ids });
  },

  updateScore: async (qualificationId: number, score: string): Promise<void> => {
    await apiClient.patch(`/held/${qualificationId}/score`, { score });
  },

  updateAcquiredAt: async (qualificationId: number, acquired_at: string | null): Promise<void> => {
    await apiClient.patch(`/held/${qualificationId}/acquired-at`, { acquired_at });
  },
};
