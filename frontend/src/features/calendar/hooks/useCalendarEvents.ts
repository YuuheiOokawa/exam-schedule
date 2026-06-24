import { useQuery } from '@tanstack/react-query';
import { calendarService } from '@/services/calendarService';

export function useCalendarEvents() {
  return useQuery({
    queryKey: ['calendar-events'],
    queryFn: calendarService.getEvents,
    staleTime: 1000 * 60,
  });
}
