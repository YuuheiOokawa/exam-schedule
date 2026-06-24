import { Link } from 'react-router-dom';
import { CalendarDays, Star, CheckCircle2, Banknote, RotateCcw, Clock } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { getLevelConfig } from '@/utils/level';
import { MAIN_CATEGORY_COLORS } from '@/constants/categories';
import { useHeldQualifications } from '@/contexts/HeldQualificationsContext';
import { cn } from '@/utils/cn';
import type { QualificationWithSchedule } from '@/types/qualification';

interface Props {
  qualification: QualificationWithSchedule;
  className?: string;
}

function getDaysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
}

function DaysChip({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold
                       bg-slate-100 dark:bg-slate-700/60 text-slate-400">
        終了
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold
                       bg-red-500 text-white shadow-sm shadow-red-500/40 animate-pulse">
        今日
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="relative inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold
                       bg-red-500 text-white shadow-sm shadow-red-500/40">
        あと{days}日
      </span>
    );
  }
  if (days <= 14) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold
                       bg-red-500 text-white">
        あと{days}日
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold
                       bg-orange-400 text-white">
        あと{days}日
      </span>
    );
  }
  if (days <= 90) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold
                       bg-amber-400/20 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300
                       border border-amber-300/60 dark:border-amber-700/40">
        あと{days}日
      </span>
    );
  }
  return null;
}

export function QualificationCard({ qualification: q, className }: Props) {
  const { isHeld, toggleHeld } = useHeldQualifications();
  const held = isHeld(q.id);
  const lv   = getLevelConfig(q.name, q.main_category);

  function handleToggleHeld(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleHeld(q.id);
  }

  const daysToExam = getDaysUntil(q.exam_date);
  const scoreEnabled = (q as { score_enabled?: number }).score_enabled === 1;
  const urgent = daysToExam !== null && daysToExam >= 0 && daysToExam <= 14;

  return (
    <Link
      to={ROUTES.QUALIFICATION_DETAIL(q.id)}
      className={cn(
        'qual-card',
        lv.cardClass,
        held && 'qual-card-held',
        className
      )}
      draggable={false}
    >
      {/* Glass top shimmer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none z-10" />
      {/* Level-tinted top gradient */}
      <div
        className="absolute inset-x-0 top-0 h-20 pointer-events-none"
        style={{ background: `linear-gradient(180deg, ${lv.color}14 0%, transparent 100%)` }}
      />

      {/* Held overlay */}
      {held && (
        <div className="absolute inset-0 bg-emerald-400/[0.03] pointer-events-none" />
      )}

      <div className="p-3 flex flex-col gap-2 relative">
        {/* ── Row 1: badges + hold button ── */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex flex-wrap gap-1 min-w-0 flex-1">
            {/* Category */}
            <span className={cn('badge text-[10px]', MAIN_CATEGORY_COLORS[q.main_category])}>
              {q.main_category}
            </span>
            {/* Difficulty */}
            <span
              className="badge text-[10px]"
              style={{
                backgroundColor: `${lv.color}18`,
                color: lv.color,
                borderColor: `${lv.color}30`,
                border: '1px solid',
              }}
            >
              <span className="flex gap-[2px] mr-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className="inline-block w-1 h-1 rounded-full"
                    style={{
                      backgroundColor: i < lv.stars ? lv.color : 'currentColor',
                      opacity: i < lv.stars ? 1 : 0.18,
                    }}
                  />
                ))}
              </span>
              <span className="font-bold">{lv.label}</span>
            </span>
          </div>

          {/* Hold button */}
          <button
            onClick={handleToggleHeld}
            aria-label={held ? '保有を解除' : '保有に追加'}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-xl shrink-0',
              'transition-all duration-200 active:scale-85',
              held
                ? 'bg-emerald-500/18 text-emerald-500 shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400/25'
                : 'text-[var(--text-4)] hover:text-amber-400 hover:bg-amber-400/12 hover:shadow-sm hover:shadow-amber-400/20'
            )}
          >
            {held
              ? <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
              : <Star className="w-4 h-4" strokeWidth={1.8} />
            }
          </button>
        </div>

        {/* ── Row 2: Qualification name ── */}
        <h3 className={cn(
          'text-[13px] sm:text-[14px] font-bold leading-snug tracking-[-0.01em]',
          'text-[var(--text-1)] line-clamp-2 min-h-[2.6em]',
          held && 'text-emerald-900 dark:text-emerald-100'
        )}>
          {q.name}
        </h3>

        {/* ── Row 3: Date / countdown ── */}
        <div className="space-y-1">
          {q.exam_date ? (
            <div className={cn(
              'flex items-center gap-1.5 flex-wrap',
              urgent && 'text-red-500 dark:text-red-400'
            )}>
              <CalendarDays className={cn(
                'w-3 h-3 shrink-0',
                urgent ? 'text-red-400' : 'text-[var(--text-2)]'
              )} />
              <span className={cn(
                'text-[11px] font-semibold tabular-nums',
                urgent ? 'text-red-500 dark:text-red-400' : 'text-[var(--text-2)]'
              )}>
                {formatDateShort(q.exam_date)}
              </span>
              {daysToExam !== null && <DaysChip days={daysToExam} />}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-2)]">
              <Clock className="w-3 h-3 shrink-0" />
              <span>
                {q.exam_format === 'anytime'  ? 'いつでも受験可' :
                 q.exam_format === 'cbt'      ? 'CBT随時' :
                 q.exam_format === 'multiple' ? '年複数回' :
                 '日程は公式で確認'}
              </span>
            </div>
          )}

          {q.exam_fee && (
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-2)]">
              <Banknote className="w-3 h-3 shrink-0" />
              <span className="truncate">{q.exam_fee}</span>
            </div>
          )}
        </div>

        {/* ── Row 4: Footer tags ── */}
        {(q.requires_renewal || scoreEnabled) && (
          <div className="flex items-center gap-1 pt-0.5">
            {q.requires_renewal && (
              <span className="inline-flex items-center gap-0.5 text-[10px]
                               text-[var(--text-3)] bg-[var(--surface-2)] dark:bg-[var(--surface-3)]
                               px-1.5 py-0.5 rounded-md border border-[var(--border)]">
                <RotateCcw className="w-2.5 h-2.5" />
                更新
              </span>
            )}
            {scoreEnabled && (
              <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400
                               bg-indigo-50 dark:bg-indigo-900/30
                               px-1.5 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800/40">
                スコア
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
