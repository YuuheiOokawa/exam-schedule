import { apiClient } from './api';
import type { QualificationWithSchedule, QualificationDetail } from '@/types/qualification';
import type { ApiSuccess } from '@/types/api';

interface GetAllParams {
  search?: string;
  main_category?: string;
  sub_category?: string;
}

interface CategoryData {
  mainCategories: string[];
  subCategories: Array<{ main_category: string; sub_category: string }>;
}

export const qualificationService = {
  getAll: async (params?: GetAllParams): Promise<QualificationWithSchedule[]> => {
    const res = await apiClient.get<ApiSuccess<QualificationWithSchedule[]>>('/qualifications', { params });
    return res.data.data;
  },

  getById: async (id: number): Promise<QualificationDetail> => {
    const res = await apiClient.get<ApiSuccess<QualificationDetail>>(`/qualifications/${id}`);
    return res.data.data;
  },

  getCategories: async (): Promise<CategoryData> => {
    const res = await apiClient.get<ApiSuccess<CategoryData>>('/qualifications/categories');
    return res.data.data;
  },

  fetchInfo: async (id: number): Promise<{ status: string; message: string }> => {
    const res = await apiClient.post<ApiSuccess<{ status: string; message: string }>>(`/qualifications/${id}/fetch`);
    return res.data.data;
  },
};
