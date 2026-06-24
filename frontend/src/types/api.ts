export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: { code: string; message: string };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface FetchLog {
  id: number;
  qualification_id: number;
  qualification_name: string;
  status: 'success' | 'error';
  message: string | null;
  fetched_at: string;
}
