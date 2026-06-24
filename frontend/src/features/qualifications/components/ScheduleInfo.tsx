import { Calendar, DollarSign, Clock, Link as LinkIcon, FileText, RefreshCw, ChevronDown, AlertCircle, CheckCircle, Info, CalendarCheck } from 'lucide-react';
import type { ExamPlanForQual } from '@/services/planService';
import { useState } from 'react';
import { formatDate, formatDatetime } from '@/utils/date';
import type { QualificationSchedule } from '@/types/qualification';
import { cn } from '@/utils/cn';

// ─── 申込ステータス判定 ───────────────────────────────────────

type AppStatus = 'accepting' | 'upcoming' | 'closed' | null;

function getAppStatus(s: QualificationSchedule): AppStatus {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const appEnd   = s.application_end_date   ? new Date(s.application_end_date)   : null;
  const appStart = s.application_start_date ? new Date(s.application_start_date) : null;

  if (!appEnd && !appStart) return null;
  if (appEnd && appEnd < today) return 'closed';
  if (appStart && appStart > today) return 'upcoming';
  return 'accepting';
}

interface StatusBadgeProps {
  status: AppStatus;
  examDate: string | null | undefined;
  /** ステータスが closed のとき、試験当日以降かどうか */
  examPast: boolean;
}

function StatusBadge({ status, examDate, examPast }: StatusBadgeProps) {
  if (!status) return null;

  if (status === 'accepting') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                      bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30
                      text-emerald-700 dark:text-emerald-400 text-[12px] font-semibold">
        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        申込受付中
      </div>
    );
  }

  if (status === 'upcoming') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                      bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30
                      text-blue-700 dark:text-blue-400 text-[12px] font-semibold">
        <Info className="w-3.5 h-3.5 shrink-0" />
        申込受付前
      </div>
    );
  }

  // closed
  const nextInfo = (!examPast && examDate)
    ? `試験日: ${formatDate(examDate)}`
    : '次回日程は未定です';

  return (
    <div className="flex items-start gap-1.5 px-3 py-1.5 rounded-xl
                    bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30
                    text-orange-700 dark:text-orange-400 text-[12px] font-semibold">
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
      <span>
        申込終了
        <span className="ml-1.5 font-normal text-orange-600/80 dark:text-orange-400/70">
          — {nextInfo}
        </span>
      </span>
    </div>
  );
}

// ─── InfoRow ─────────────────────────────────────────────────

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  if (!value || value === '-') return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
      <div className="mt-0.5 text-[var(--text-3)] shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[var(--text-3)] mb-0.5">{label}</p>
        <p className="text-[13px] text-[var(--text-1)] break-words">{value}</p>
      </div>
    </div>
  );
}

// ─── ScheduleCard (複数日程用) ────────────────────────────────

function ScheduleCard({ s, index, defaultOpen }: { s: QualificationSchedule; index: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const isPlaceholder = s.note?.includes('管理画面から日程を手動登録') || s.note?.includes('初期データ');
  const hasContent = s.exam_date || s.application_start_date || s.application_end_date
    || s.result_announcement_date || s.exam_fee;

  const status = getAppStatus(s);
  const today = new Date(); today.setHours(0,0,0,0);
  const examPast = s.exam_date ? new Date(s.exam_date) < today : true;

  const label = s.exam_date
    ? `第${index + 1}回 (${formatDate(s.exam_date)})`
    : s.note && !isPlaceholder
      ? `第${index + 1}回 — ${s.note}`
      : `第${index + 1}回`;

  if (isPlaceholder && !hasContent) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3
                   bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors text-left gap-2"
      >
        <span className="text-[13px] font-semibold text-[var(--text-1)]">{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          {status && (
            <span className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full',
              status === 'closed'    && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
              status === 'accepting' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
              status === 'upcoming'  && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            )}>
              {status === 'closed' ? '申込終了' : status === 'accepting' ? '申込中' : '申込前'}
            </span>
          )}
          <ChevronDown className={cn('w-4 h-4 text-[var(--text-3)] transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="px-4 py-1">
          {status === 'closed' && (
            <div className="py-2">
              <StatusBadge status={status} examDate={s.exam_date} examPast={examPast} />
            </div>
          )}
          <InfoRow icon={<Calendar className="w-4 h-4" />}                        label="試験日"      value={formatDate(s.exam_date)} />
          <InfoRow icon={<Calendar className="w-4 h-4 text-emerald-500" />}       label="申込開始日"  value={formatDate(s.application_start_date)} />
          <InfoRow icon={<Calendar className="w-4 h-4 text-red-500" />}           label="申込締切日"  value={formatDate(s.application_end_date)} />
          <InfoRow icon={<Calendar className="w-4 h-4 text-violet-500" />}        label="合格発表日"  value={formatDate(s.result_announcement_date)} />
          <InfoRow icon={<DollarSign className="w-4 h-4" />}                      label="受験料"      value={s.exam_fee} />
          <InfoRow icon={<LinkIcon className="w-4 h-4" />}                        label="情報取得元"  value={s.source_url} />
          <InfoRow icon={<Clock className="w-4 h-4" />}                           label="最終取得日時" value={formatDatetime(s.fetched_at)} />
          {s.note && !isPlaceholder && (
            <InfoRow icon={<FileText className="w-4 h-4" />} label="備考" value={s.note} />
          )}
          {!hasContent && <p className="text-[12px] text-[var(--text-3)] py-3 text-center">日程情報がありません</p>}
        </div>
      )}
    </div>
  );
}

// ─── ScheduleInfo (メイン) ────────────────────────────────────

interface ScheduleInfoProps {
  schedules: QualificationSchedule[];
  requiresRenewal?: number;
  renewalPeriodYears?: number | null;
  userPlans?: ExamPlanForQual[];
}

function UserPlansFallback({ plans }: { plans: ExamPlanForQual[] }) {
  return (
    <div className="space-y-2">
      {plans.map((plan) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const d = new Date(plan.planned_date); d.setHours(0, 0, 0, 0);
        const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
        const past = days < 0;
        return (
          <div key={plan.id}
            className="flex items-center gap-3 p-3 rounded-xl
                       bg-teal-50 dark:bg-teal-900/10
                       border border-teal-200 dark:border-teal-800/30">
            <CalendarCheck className="w-4 h-4 text-teal-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[var(--text-1)]">
                {d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
              </p>
              <p className={cn('text-[11px] font-semibold',
                past ? 'text-[var(--text-4)]' : 'text-teal-600 dark:text-teal-400')}>
                あなたの受験予定
                {!past && days <= 30 && ` · あと${days}日`}
                {plan.notes ? ` · ${plan.notes}` : ''}
              </p>
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-[var(--text-4)] text-center pt-1">
        公式スケジュールはまだ登録されていません
      </p>
    </div>
  );
}

export function ScheduleInfo({ schedules, requiresRenewal, renewalPeriodYears, userPlans = [] }: ScheduleInfoProps) {
  const pendingPlans = userPlans.filter((p) => !p.result);
  if (!schedules || schedules.length === 0) {
    if (pendingPlans.length > 0) return <UserPlansFallback plans={pendingPlans} />;
    return (
      <div className="text-center py-8 text-[var(--text-3)]">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-[12px]">スケジュール情報がありません</p>
      </div>
    );
  }

  const showAsMultiple = schedules.length > 1;

  if (showAsMultiple) {
    return (
      <div className="space-y-2">
        {schedules.map((s, i) => (
          <ScheduleCard key={s.id} s={s} index={i} defaultOpen={i === 0} />
        ))}
        {requiresRenewal && (
          <div className="flex items-center gap-2 px-2 py-1">
            <RefreshCw className="w-3.5 h-3.5 text-[var(--text-3)]" />
            <p className="text-[12px] text-[var(--text-3)]">
              {renewalPeriodYears ? `${renewalPeriodYears}年ごとに更新が必要` : '更新が必要'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ─── 単一スケジュール ─────────────────────────────────────────
  const s = schedules[0];
  const isPlaceholder = s.note?.includes('管理画面から日程を手動登録') || s.note?.includes('初期データ');
  const hasContent = s.exam_date || s.application_start_date || s.application_end_date
    || s.result_announcement_date || s.exam_fee;

  const status = getAppStatus(s);
  const today = new Date(); today.setHours(0,0,0,0);
  const examPast = s.exam_date ? new Date(s.exam_date) < today : true;

  if (!hasContent && isPlaceholder) {
    if (pendingPlans.length > 0) return <UserPlansFallback plans={pendingPlans} />;
    return (
      <div className="text-center py-6 text-[var(--text-3)]">
        <Calendar className="w-6 h-6 mx-auto mb-2 opacity-40" />
        <p className="text-[12px]">スケジュール情報がありません</p>
        <p className="text-[11px] mt-0.5 text-[var(--text-4)]">管理画面から日程を登録できます</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ステータスバナー */}
      {status && (
        <StatusBadge status={status} examDate={s.exam_date} examPast={examPast} />
      )}

      <div>
        <InfoRow icon={<Calendar className="w-4 h-4" />}                       label="試験日"      value={formatDate(s.exam_date)} />
        <InfoRow icon={<Calendar className="w-4 h-4 text-emerald-500" />}      label="申込開始日"  value={formatDate(s.application_start_date)} />
        <InfoRow icon={<Calendar className="w-4 h-4 text-red-500" />}          label="申込締切日"  value={formatDate(s.application_end_date)} />
        <InfoRow icon={<Calendar className="w-4 h-4 text-violet-500" />}       label="合格発表日"  value={formatDate(s.result_announcement_date)} />
        <InfoRow icon={<DollarSign className="w-4 h-4" />}                     label="受験料"      value={s.exam_fee} />
        {requiresRenewal ? (
          <InfoRow icon={<RefreshCw className="w-4 h-4" />} label="更新期間"
            value={renewalPeriodYears ? `${renewalPeriodYears}年ごとに更新が必要` : '更新が必要'} />
        ) : null}
        <InfoRow icon={<LinkIcon className="w-4 h-4" />}                       label="情報取得元"  value={s.source_url} />
        <InfoRow icon={<Clock className="w-4 h-4" />}                          label="最終取得日時" value={formatDatetime(s.fetched_at)} />
        {s.note && !isPlaceholder && (
          <InfoRow icon={<FileText className="w-4 h-4" />}                     label="備考"        value={s.note} />
        )}
        {!hasContent && (
          <div className="text-center py-6 text-[var(--text-3)]">
            <Calendar className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p className="text-[12px]">スケジュール情報がありません</p>
            <p className="text-[11px] mt-0.5 text-[var(--text-4)]">管理画面から日程を登録できます</p>
          </div>
        )}
      </div>
    </div>
  );
}
