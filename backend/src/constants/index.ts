export const PORT = parseInt(process.env.PORT ?? '3001', 10);
export const SCRAPE_INTERVAL_MS = 3000;
export const FETCH_TIMEOUT_MS = 10000;
export const MAX_LOGS = 100;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SCRAPE_FAILED: 'SCRAPE_FAILED',
} as const;

export const CALENDAR_EVENT_COLORS = {
  exam: { bg: '#1D4ED8', border: '#1E3A8A' },
  application_start: { bg: '#10B981', border: '#059669' },
  application_end: { bg: '#EF4444', border: '#DC2626' },
  result: { bg: '#8B5CF6', border: '#7C3AED' },
} as const;
