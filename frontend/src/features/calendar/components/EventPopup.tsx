import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ExternalLink, DollarSign, FileText, CalendarPlus, Check, Loader2 } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import type { CalendarEvent } from '@/types/calendar';

interface EventPopupProps {
  event: CalendarEvent & { start: string };
  onClose: () => void;
  onAddPlan?: (qualId: number, date: string) => Promise<void>;
  alreadyPlanned?: boolean;
}

export function EventPopup({ event, onClose, onAddPlan, alreadyPlanned }: EventPopupProps) {
  const { extendedProps } = event;
  const [adding, setAdding]   = useState(false);
  const [added,  setAdded]    = useState(false);

  const canAdd = onAddPlan
    && extendedProps.event_type === 'exam_date'
    && !alreadyPlanned
    && !added;

  async function handleAddPlan() {
    if (!onAddPlan) return;
    setAdding(true);
    try {
      await onAddPlan(extendedProps.qualification_id, event.start);
      setAdded(true);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="閉じる"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          <span
            className="inline-block px-2.5 py-1 rounded-full text-xs font-bold text-white mb-3"
            style={{ backgroundColor: event.backgroundColor }}
          >
            {extendedProps.event_type === 'exam_date' ? '試験日'
              : extendedProps.event_type === 'application_deadline' ? '申込締切'
              : extendedProps.event_type === 'my_plan' ? '受験予定'
              : extendedProps.event_type}
          </span>

          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 leading-tight pr-8">
            {extendedProps.qualification_name}
          </h2>

          <p className="text-3xl font-extrabold text-brand-700 dark:text-brand-400 mb-4">
            {event.start}
          </p>

          {extendedProps.exam_fee && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-2">
              <DollarSign className="w-4 h-4 shrink-0 text-slate-400" />
              <span>{extendedProps.exam_fee}</span>
            </div>
          )}

          {extendedProps.note && !extendedProps.note.includes('初期データ') && (
            <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 mb-4">
              <FileText className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
              <span className="line-clamp-2">{extendedProps.note}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mt-2">
            <Link
              to={ROUTES.QUALIFICATION_DETAIL(extendedProps.qualification_id)}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              詳細を見る
            </Link>

            {(canAdd || added || alreadyPlanned) && (
              <button
                onClick={canAdd ? handleAddPlan : undefined}
                disabled={adding || added || alreadyPlanned}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold
                            transition-all active:scale-95 disabled:cursor-default ${
                  added || alreadyPlanned
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {adding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (added || alreadyPlanned) ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <CalendarPlus className="w-3.5 h-3.5" />
                )}
                {(added || alreadyPlanned) ? '予定済み' : '受験予定に追加'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
