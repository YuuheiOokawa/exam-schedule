import { cn } from '@/utils/cn';
import { EVENT_TYPE_CONFIG } from '@/constants/eventTypes';
import type { CalendarEventType } from '@/types/calendar';

type FilterValue = 'all' | CalendarEventType;

interface EventFilterProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}

export function EventFilter({ value, onChange }: EventFilterProps) {
  const filters: Array<{ value: FilterValue; label: string; color?: string }> = [
    { value: 'all', label: 'すべて' },
    ...Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => ({
      value: k as CalendarEventType,
      label: v.label,
      color: v.color,
    })),
  ];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="イベントタイプフィルター">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150',
            value === f.value
              ? 'bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-900/30 dark:border-brand-600 dark:text-brand-300'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
          )}
          aria-pressed={value === f.value}
        >
          {f.color && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: f.color }}
            />
          )}
          {f.label}
        </button>
      ))}
    </div>
  );
}
