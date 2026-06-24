import { EVENT_TYPE_CONFIG } from '@/constants/eventTypes';

export function EventLegend() {
  return (
    <div className="flex flex-wrap gap-4" aria-label="凡例">
      {Object.values(EVENT_TYPE_CONFIG).map((config) => (
        <div key={config.label} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">{config.label}</span>
        </div>
      ))}
    </div>
  );
}
