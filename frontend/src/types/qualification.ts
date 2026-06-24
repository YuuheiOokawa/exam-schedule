export type ExamFormat = 'fixed_date' | 'anytime' | 'regional' | 'cbt' | 'multiple';

export interface Qualification {
  id: number;
  name: string;
  main_category: string;
  sub_category: string;
  official_url: string | null;
  description: string | null;
  is_scrapable: number;
  exam_format: ExamFormat;
  requires_renewal: number;
  renewal_period_years: number | null;
  score_enabled: number;
  score_unit: string | null;
  score_max: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualificationSchedule {
  id: number;
  qualification_id: number;
  exam_date: string | null;
  application_start_date: string | null;
  application_end_date: string | null;
  result_announcement_date: string | null;
  exam_fee: string | null;
  source_url: string | null;
  fetched_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualificationWithSchedule extends Qualification {
  schedule_id: number | null;
  exam_date: string | null;
  application_start_date: string | null;
  application_end_date: string | null;
  result_announcement_date: string | null;
  exam_fee: string | null;
  source_url: string | null;
  fetched_at: string | null;
  note: string | null;
}

export interface QualificationDetail extends Qualification {
  schedules: QualificationSchedule[];
}
