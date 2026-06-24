import { apiClient } from './api';

export interface ScoreSectionDef {
  section_key: string;
  section_label: string;
  max_score: number | null;
  sort_order: number;
}

export interface ScoreEntry {
  id: number;
  score: string;
  taken_at: string;
  notes: string | null;
  created_at: string;
  section_values: Record<string, string> | null;
}

export const scoreService = {
  getSectionDefs: async (qualificationId: number): Promise<ScoreSectionDef[]> => {
    const res = await apiClient.get<{ success: boolean; data: ScoreSectionDef[] }>(
      `/scores/defs/${qualificationId}`
    );
    return res.data.data;
  },

  getHistory: async (qualificationId: number): Promise<ScoreEntry[]> => {
    const res = await apiClient.get<{ success: boolean; data: ScoreEntry[] }>(
      `/scores/${qualificationId}`
    );
    return res.data.data;
  },

  addScore: async (
    qualificationId: number,
    score: string,
    taken_at: string,
    notes?: string,
    section_values?: Record<string, string>
  ): Promise<{ id: number }> => {
    const res = await apiClient.post<{ success: boolean; data: { id: number } }>(
      `/scores/${qualificationId}`,
      { score, taken_at, notes, section_values }
    );
    return res.data.data;
  },

  deleteScore: async (scoreId: number): Promise<void> => {
    await apiClient.delete(`/scores/${scoreId}`);
  },
};
