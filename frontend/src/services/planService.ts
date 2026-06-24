import { apiClient } from './api';

export interface ExamPlan {
  id: number;
  qualification_id: number;
  qualification_name: string;
  sub_category: string;
  planned_date: string;
  notes: string | null;
  result: 'passed' | 'failed' | null;
  created_at: string;
}

export interface ExamPlanForQual {
  id: number;
  qualification_id: number;
  planned_date: string;
  notes: string | null;
  result: 'passed' | 'failed' | null;
  created_at: string;
}

export const planService = {
  getAll: async (): Promise<ExamPlan[]> => {
    const res = await apiClient.get<{ success: boolean; data: ExamPlan[] }>('/plans');
    return res.data.data;
  },

  getForQualification: async (qualificationId: number): Promise<ExamPlanForQual[]> => {
    const res = await apiClient.get<{ success: boolean; data: ExamPlanForQual[] }>(
      `/plans/qualification/${qualificationId}`
    );
    return res.data.data;
  },

  add: async (
    qualificationId: number,
    planned_date: string,
    notes?: string
  ): Promise<{ id: number }> => {
    const res = await apiClient.post<{ success: boolean; data: { id: number } }>('/plans', {
      qualification_id: qualificationId,
      planned_date,
      notes,
    });
    return res.data.data;
  },

  update: async (planId: number, planned_date: string, notes?: string): Promise<void> => {
    await apiClient.patch(`/plans/${planId}`, { planned_date, notes });
  },

  delete: async (planId: number): Promise<void> => {
    await apiClient.delete(`/plans/${planId}`);
  },

  setResult: async (planId: number, result: 'passed' | 'failed'): Promise<void> => {
    await apiClient.patch(`/plans/${planId}/result`, { result });
  },
};
