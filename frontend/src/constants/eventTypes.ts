import type { CalendarEventType } from '@/types/calendar';

export const EVENT_TYPE_CONFIG: Record<
  CalendarEventType,
  { label: string; color: string; icon: string }
> = {
  exam: { label: '試験日', color: '#1D4ED8', icon: '📝' },
  application_start: { label: '申込開始', color: '#10B981', icon: '🟢' },
  application_end: { label: '申込締切', color: '#EF4444', icon: '🔴' },
  result:  { label: '合格発表', color: '#8B5CF6', icon: '🏆' },
  my_plan: { label: '受験予定', color: '#0d9488', icon: '📌' },
};
