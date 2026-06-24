export type ExamFormat = 'fixed_date' | 'anytime' | 'regional';
export type FetchStatus = 'success' | 'error';

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

export interface FetchLog {
  id: number;
  qualification_id: number;
  qualification_name?: string;
  status: FetchStatus;
  message: string | null;
  fetched_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor: string;
  borderColor: string;
  type: 'exam' | 'application_start' | 'application_end' | 'result';
  extendedProps: {
    qualification_id: number;
    qualification_name: string;
    event_type: string;
    exam_fee: string | null;
    note: string | null;
  };
}

export interface ScraperResult {
  success: boolean;
  data?: Partial<QualificationSchedule>;
  error?: string;
}

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: { code: string; message: string } };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type UserRole = 'admin' | 'viewer';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface UserPublic {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface SeedQualification {
  name: string;
  main_category: string;
  sub_category: string;
  official_url: string;
  description: string;
  is_scrapable: boolean;
  exam_format: ExamFormat;
  requires_renewal: boolean;
  renewal_period_years: number | null;
}
