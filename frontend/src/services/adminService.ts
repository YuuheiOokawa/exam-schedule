import { apiClient } from './api';
import type { QualificationWithSchedule } from '@/types/qualification';
import type { ApiSuccess } from '@/types/api';

export interface QualificationFormData {
  name: string;
  main_category: string;
  sub_category: string;
  official_url?: string;
  description?: string;
  is_scrapable?: boolean;
  exam_format?: string;
  requires_renewal?: boolean;
  renewal_period_years?: number | null;
  score_enabled?: boolean;
  score_unit?: string;
  score_max?: string;
}

export interface ScheduleFormData {
  exam_date?: string;
  application_start_date?: string;
  application_end_date?: string;
  result_announcement_date?: string;
  exam_fee?: string;
  source_url?: string;
  note?: string;
}

export const adminService = {
  getAll: async (): Promise<QualificationWithSchedule[]> => {
    const res = await apiClient.get<ApiSuccess<QualificationWithSchedule[]>>('/admin/qualifications');
    return res.data.data;
  },

  create: async (data: QualificationFormData): Promise<QualificationWithSchedule> => {
    const res = await apiClient.post<ApiSuccess<QualificationWithSchedule>>('/admin/qualifications', data);
    return res.data.data;
  },

  update: async (id: number, data: Partial<QualificationFormData>): Promise<QualificationWithSchedule> => {
    const res = await apiClient.put<ApiSuccess<QualificationWithSchedule>>(`/admin/qualifications/${id}`, data);
    return res.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/qualifications/${id}`);
  },

  updateSchedule: async (qualificationId: number, data: ScheduleFormData): Promise<void> => {
    await apiClient.put(`/admin/schedules/${qualificationId}`, data);
  },

  updateScheduleById: async (scheduleId: number, data: ScheduleFormData): Promise<void> => {
    await apiClient.put(`/admin/schedules/record/${scheduleId}`, data);
  },

  syncStripePrice: async (planCode: string, stripePriceId: string): Promise<void> => {
    await apiClient.post('/stripe/sync-price', { plan_code: planCode, stripe_price_id: stripePriceId });
  },

  uploadScheduleCsv: async (csvText: string): Promise<{
    updated: number; inserted: number; skipped: number; urlUpdated: number; errors: string[];
  }> => {
    const res = await apiClient.post<ApiSuccess<{
      updated: number; inserted: number; skipped: number; urlUpdated: number; errors: string[];
    }>>('/admin/upload-schedule', { csv: csvText }, { timeout: 120000 });
    return res.data.data;
  },
};
