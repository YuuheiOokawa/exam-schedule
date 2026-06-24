import { apiClient } from './api';
import type { CalendarEvent } from '@/types/calendar';
import type { ApiSuccess } from '@/types/api';

export const calendarService = {
  getEvents: async (): Promise<CalendarEvent[]> => {
    const res = await apiClient.get<ApiSuccess<CalendarEvent[]>>('/calendar/events');
    return res.data.data;
  },
};
