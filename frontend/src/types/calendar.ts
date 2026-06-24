export type CalendarEventType = 'exam' | 'application_start' | 'application_end' | 'result' | 'my_plan';

export interface CalendarEventExtendedProps {
  qualification_id: number;
  qualification_name: string;
  event_type: string;
  exam_fee: string | null;
  note: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor: string;
  borderColor: string;
  type: CalendarEventType;
  extendedProps: CalendarEventExtendedProps;
}
