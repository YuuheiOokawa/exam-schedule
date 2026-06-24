import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Star, Calendar, ChevronRight, AlertTriangle,
  BookOpen, Map as MapIcon, GraduationCap, Clock, TrendingUp, CalendarCheck,
  CheckCircle2, XCircle, BarChart2,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useHeldQualifications } from '@/contexts/HeldQualificationsContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useQualifications } from '@/features/qualifications/hooks/useQualifications';
import { planService } from '@/services/planService';
import type { ExamPlan } from '@/services/planService';
import { heldService } from '@/services/heldService';
import type { HeldDetail } from '@/services/heldService';
import { subscriptionService } from '@/services/subscriptionService';
import { apiClient } from '@/services/api';
import { PremiumFeatureGate } from '@/components/premium/PremiumFeatureGate';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';
import type { QualificationWithSchedule } from '@/types/qualification';

interface AnalyticsData {
  exam_stats: { total: number; passed: number; failed: number; pass_rate: number | null };
  monthly_exams: Array<{ month: string; count: number; passed: number }>;
  category_stats: Array<{ category: string; total: number; passed: number; pass_rate: number }>;
  score_trends: Array<{ qualification_id: number; qualification_name: string; score: string; unit: string; taken_at: string }>;
  last_activity_at: string | null;
  next_exam: { qualification_name: string; planned_date: string } | null;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'おはようございます';
  if (h >= 12 && h < 18) return 'こんにちは';
  return 'こんばんは';
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(dateStr);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / 86_400_000);
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

interface ExamItem {
  qual: QualificationWithSchedule;
  date: string;
  type: 'exam' | 'deadline';
  days: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { count: heldCount, refreshHeld } = useHeldQualifications();
  const { count: wishlistCount } = useWishlist();
  const { data: qualifications = [] } = useQualifications({});
  const queryClient = useQueryClient();
  const [resultLoading, setResultLoading] = useState<number | null>(null);

  const { data: rawPlans = [] } = useQuery({
    queryKey: ['exam-plans-all'],
    queryFn:  planService.getAll,
    enabled:  !!user,
  });
  const { data: heldDetails = [] } = useQuery<HeldDetail[]>({
    queryKey: ['held-details'],
    queryFn:  heldService.getDetails,
    enabled:  !!user,
  });

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn:  subscriptionService.getStatus,
    enabled:  !!user,
  });
  const isPremium = statusData?.is_premium ?? false;
  const isStatusResolving = !!user && statusLoading && !statusData;

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics-progress'],
    queryFn:  async () => {
      const res = await apiClient.get<{ success: boolean; data: AnalyticsData }>('/analytics/progress');
      return res.data.data;
    },
    enabled: !!user && isPremium,
    retry: false,
  });
  const heldDetailMap = useMemo(
    () => new Map(heldDetails.map((d) => [d.qualification_id, d])),
    [heldDetails]
  );
  const myPlans = useMemo(() =>
    [...rawPlans].sort((a, b) => a.planned_date.localeCompare(b.planned_date)),
  [rawPlans]);

  async function handlePlanResult(plan: ExamPlan, result: 'passed' | 'failed') {
    setResultLoading(plan.id);
    try {
      await planService.setResult(plan.id, result);
      await queryClient.invalidateQueries({ queryKey: ['exam-plans-all'] });
      await queryClient.invalidateQueries({ queryKey: ['plans', plan.qualification_id] });
      if (result === 'passed') {
        await queryClient.invalidateQueries({ queryKey: ['held-details'] });
        await refreshHeld();
      }
    } finally {
      setResultLoading(null);
    }
  }

  const { upcoming, urgent } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in90 = new Date(today); in90.setDate(in90.getDate() + 90);
    const in14 = new Date(today); in14.setDate(in14.getDate() + 14);

    const upcomingItems: ExamItem[] = [];
    const urgentItems: ExamItem[] = [];

    for (const q of qualifications) {
      if (q.exam_date) {
        const d = new Date(q.exam_date);
        d.setHours(0, 0, 0, 0);
        if (d >= today && d <= in90) {
          const days = daysUntil(q.exam_date);
          upcomingItems.push({ qual: q, date: q.exam_date, type: 'exam', days });
        }
      }
      if (q.application_end_date) {
        const d = new Date(q.application_end_date);
        d.setHours(0, 0, 0, 0);
        if (d >= today && d <= in14) {
          urgentItems.push({
            qual: q,
            date: q.application_end_date,
            type: 'deadline',
            days: daysUntil(q.application_end_date),
          });
        }
      }
    }

    upcomingItems.sort((a, b) => a.days - b.days);
    urgentItems.sort((a, b) => a.days - b.days);

    return { upcoming: upcomingItems.slice(0, 8), urgent: urgentItems.slice(0, 3) };
  }, [qualifications]);

  return (
    <div className="min-h-screen bg-[var(--bg)] page-enter">
      {/* ── Hero Header ─────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Mesh gradient base */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 70% 60% at 10% 40%, rgba(129,140,248,0.70), transparent 65%),
            radial-gradient(ellipse 60% 75% at 90% 0%, rgba(167,139,250,0.60), transparent 60%),
            radial-gradient(ellipse 50% 50% at 50% 100%, rgba(99,102,241,0.45), transparent 55%),
            radial-gradient(ellipse 40% 40% at 70% 60%, rgba(139,92,246,0.30), transparent 50%),
            linear-gradient(150deg, #12103a 0%, #1e1b4b 20%, #312e81 45%, #4c1d95 75%, #1a1040 100%)
          `,
        }} />
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")',
          }}
        />
        {/* Animated ambient orbs */}
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-violet-500/[0.18] blur-[80px] pointer-events-none animate-orb-float" />
        <div className="absolute -bottom-16 -left-12 w-72 h-72 rounded-full bg-indigo-500/[0.22] blur-[72px] pointer-events-none animate-orb-float-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-40 rounded-full bg-purple-600/[0.10] blur-[60px] pointer-events-none animate-orb-float" style={{ animationDelay: '-5s' }} />
        {/* Top highlight line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/30 to-transparent pointer-events-none" />

        <div className="relative px-4 pt-7 pb-9 max-w-3xl mx-auto">
          <div className="flex items-start justify-between mb-7">
            <div className="animate-fade-up">
              <p className="text-indigo-200/70 text-[11px] font-semibold mb-1.5 tracking-[0.12em] uppercase">
                {getGreeting()}{user ? `、${user.name.split(/\s/)[0]}さん` : ''}
              </p>
              <h1 className="text-white text-[26px] font-extrabold leading-tight tracking-[-0.02em]">
                資格スケジュール
              </h1>
              <p className="text-indigo-300/60 text-[12px] mt-1.5 font-medium">今日も着実に前進しましょう</p>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 0 0 1px rgba(255,255,255,0.1), 0 4px 16px rgba(0,0,0,0.25)',
              }}>
              <GraduationCap className="w-6 h-6 text-white" strokeWidth={2.2} />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2.5 animate-fade-up" style={{ animationDelay: '100ms' }}>
            {user ? (
              <>
                <Link to={ROUTES.HELD}
                  className="group rounded-2xl p-3.5 active:scale-95 transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.11)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 0.5px rgba(255,255,255,0.1), 0 2px 12px rgba(0,0,0,0.2)',
                  }}>
                  <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center mb-2.5 shadow-inner">
                    <Trophy className="w-3.5 h-3.5 text-yellow-200" strokeWidth={2.5} />
                  </div>
                  <p className="text-white font-extrabold text-[24px] tabular-nums leading-none tracking-tight animate-count-up">{heldCount}</p>
                  <p className="text-indigo-200/60 text-[10px] mt-1 font-medium tracking-wide">保有資格</p>
                </Link>
                <Link to={ROUTES.WISHLIST}
                  className="group rounded-2xl p-3.5 active:scale-95 transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.11)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 0.5px rgba(255,255,255,0.1), 0 2px 12px rgba(0,0,0,0.2)',
                  }}>
                  <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center mb-2.5 shadow-inner">
                    <Star className="w-3.5 h-3.5 text-amber-200" strokeWidth={2.5} />
                  </div>
                  <p className="text-white font-extrabold text-[24px] tabular-nums leading-none tracking-tight animate-count-up stagger-2">{wishlistCount}</p>
                  <p className="text-indigo-200/60 text-[10px] mt-1 font-medium tracking-wide">挑戦リスト</p>
                </Link>
              </>
            ) : (
              <>
                <Link to={ROUTES.LOGIN}
                  className="rounded-2xl p-3.5 active:scale-95 transition-all duration-200 col-span-2"
                  style={{
                    background: 'rgba(255,255,255,0.11)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 0.5px rgba(255,255,255,0.1), 0 2px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  <Trophy className="w-4 h-4 text-yellow-200 mb-2" strokeWidth={2} />
                  <p className="text-indigo-100/80 text-[12px]">ログインして保有資格・挑戦リストを管理</p>
                </Link>
              </>
            )}
            <div className="rounded-2xl p-3.5"
                 style={{
                   background: 'rgba(255,255,255,0.11)',
                   backdropFilter: 'blur(16px)',
                   WebkitBackdropFilter: 'blur(16px)',
                   boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 0.5px rgba(255,255,255,0.1), 0 2px 12px rgba(0,0,0,0.2)',
                 }}>
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center mb-2.5 shadow-inner">
                <Calendar className="w-3.5 h-3.5 text-blue-200" strokeWidth={2.5} />
              </div>
              <p className="text-white font-extrabold text-[24px] tabular-nums leading-none tracking-tight">{upcoming.length}</p>
              <p className="text-indigo-200/60 text-[10px] mt-1 font-medium tracking-wide">直近試験</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">

        {/* ── Urgent Alerts ────────────────────────── */}
        {urgent.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="text-[13px] font-bold text-red-600 dark:text-red-400">申込締切が迫っています</h2>
            </div>
            <div className="space-y-2">
              {urgent.map(({ qual, date, days }) => (
                <Link
                  key={qual.id}
                  to={ROUTES.QUALIFICATION_DETAIL(qual.id)}
                  className="flex items-center gap-3 p-3.5 rounded-2xl
                             bg-red-50 dark:bg-red-900/10 border border-red-200/70 dark:border-red-800/30
                             active:scale-[0.99] transition-transform"
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shrink-0',
                    days === 0 ? 'bg-red-600' : days <= 3 ? 'bg-red-500' : 'bg-orange-500'
                  )}>
                    {days === 0 ? '今日' : `${days}日`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[var(--text-1)] truncate">{qual.name}</p>
                    <p className="text-[11px] text-red-500 dark:text-red-400">
                      申込締切：{formatDateFull(date)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-3)] shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── My Exam Plans ────────────────────────── */}
        {user && myPlans.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-teal-500" />
                <h2 className="text-[14px] font-extrabold text-[var(--text-1)]">受験予定</h2>
              </div>
              <Link to={ROUTES.CALENDAR} className="text-[12px] text-indigo-600 dark:text-indigo-400 font-semibold
                                                    flex items-center gap-0.5">
                カレンダー <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {myPlans.slice(0, 5).map((plan) => {
                const days = daysUntil(plan.planned_date);
                const past = days < 0;
                const needsResult = past && plan.result === null;

                const dateBox = (
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0',
                    plan.result === 'passed' ? 'bg-emerald-100 dark:bg-emerald-900/30'
                    : plan.result === 'failed' ? 'bg-red-100 dark:bg-red-900/30'
                    : past ? 'bg-[var(--surface-2)]' : 'bg-teal-100 dark:bg-teal-900/30'
                  )}>
                    <span className={cn('text-[10px] font-bold leading-none',
                      plan.result === 'passed' ? 'text-emerald-600 dark:text-emerald-400'
                      : plan.result === 'failed' ? 'text-red-500 dark:text-red-400'
                      : past ? 'text-[var(--text-4)]' : 'text-teal-600 dark:text-teal-400')}>
                      {new Date(plan.planned_date).getMonth() + 1}月
                    </span>
                    <span className={cn('text-[16px] font-extrabold tabular-nums leading-tight',
                      plan.result === 'passed' ? 'text-emerald-700 dark:text-emerald-300'
                      : plan.result === 'failed' ? 'text-red-600 dark:text-red-400'
                      : past ? 'text-[var(--text-4)]' : 'text-teal-700 dark:text-teal-300')}>
                      {new Date(plan.planned_date).getDate()}
                    </span>
                  </div>
                );

                if (needsResult) {
                  return (
                    <div
                      key={plan.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--surface)]
                                 border border-amber-200/70 dark:border-amber-700/30"
                    >
                      {dateBox}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-[var(--text-1)] truncate">{plan.qualification_name}</p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">結果を記録しましょう</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handlePlanResult(plan, 'passed')}
                          disabled={resultLoading === plan.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold
                                     bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400
                                     active:scale-95 transition-transform disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          合格
                        </button>
                        <button
                          onClick={() => handlePlanResult(plan, 'failed')}
                          disabled={resultLoading === plan.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold
                                     bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400
                                     active:scale-95 transition-transform disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          不合格
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={plan.id}
                    to={ROUTES.QUALIFICATION_DETAIL(plan.qualification_id)}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--surface)]
                               border border-teal-200/50 dark:border-teal-800/30
                               active:scale-[0.99] transition-transform"
                  >
                    {dateBox}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[var(--text-1)] truncate">{plan.qualification_name}</p>
                      <p className="text-[11px] text-[var(--text-2)] mt-0.5">
                        受験予定{plan.notes ? ` · ${plan.notes}` : ''}
                      </p>
                    </div>
                    {plan.result === 'passed' ? (
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full
                                         bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> 合格
                        </span>
                        {heldDetailMap.get(plan.qualification_id)?.acquired_at && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            {new Date(heldDetailMap.get(plan.qualification_id)!.acquired_at!).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}取得
                          </span>
                        )}
                      </div>
                    ) : plan.result === 'failed' ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full
                                       bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 shrink-0">
                        <XCircle className="w-3 h-3" /> 不合格
                      </span>
                    ) : (
                      <span className={cn(
                        'text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0',
                        past ? 'bg-[var(--surface-2)] text-[var(--text-4)]'
                             : days === 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                             : days <= 14 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                             : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                      )}>
                        {past ? `${Math.abs(days)}日前` : days === 0 ? '今日' : `${days}日後`}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Analytics (premium) ─────────────────── */}
        {user && (
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <BarChart2 className="w-4 h-4 text-[var(--text-3)]" />
              <h2 className="text-[14px] font-extrabold text-[var(--text-1)]">学習進捗分析</h2>
            </div>
            {isStatusResolving || (isPremium && analyticsLoading) ? (
              <div className="card p-4 h-20 animate-pulse bg-[var(--surface-2)] rounded-2xl" />
            ) : isPremium && analytics ? (
              <div className="card p-4 space-y-3">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center gap-0.5 p-3 rounded-xl bg-[var(--surface-2)]">
                    <p className="text-[20px] font-extrabold text-[var(--text-1)] tabular-nums leading-none">
                      {analytics.exam_stats.pass_rate !== null ? `${analytics.exam_stats.pass_rate}%` : '—'}
                    </p>
                    <p className="text-[10px] text-[var(--text-3)]">合格率</p>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 p-3 rounded-xl bg-[var(--surface-2)]">
                    <p className="text-[20px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                      {analytics.exam_stats.passed}
                    </p>
                    <p className="text-[10px] text-[var(--text-3)]">合格</p>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 p-3 rounded-xl bg-[var(--surface-2)]">
                    <p className="text-[20px] font-extrabold text-[var(--text-1)] tabular-nums leading-none">
                      {analytics.exam_stats.total}
                    </p>
                    <p className="text-[10px] text-[var(--text-3)]">受験数</p>
                  </div>
                </div>

                {/* Next exam */}
                {analytics.next_exam && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/15
                                  border border-teal-200/60 dark:border-teal-800/30">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-[var(--text-1)] truncate">
                        {analytics.next_exam.qualification_name}
                      </p>
                      <p className="text-[11px] text-teal-600 dark:text-teal-400">
                        次回受験：{new Date(analytics.next_exam.planned_date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Category breakdown */}
                {analytics.category_stats.length > 0 && (
                  <div className="space-y-1.5">
                    {analytics.category_stats.slice(0, 3).map((cat) => (
                      <div key={cat.category} className="flex items-center gap-2">
                        <p className="text-[11px] text-[var(--text-3)] w-24 shrink-0 truncate">{cat.category}</p>
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${cat.pass_rate}%` }}
                          />
                        </div>
                        <p className="text-[11px] font-bold text-[var(--text-2)] w-8 text-right tabular-nums">
                          {cat.pass_rate}%
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Monthly bar chart */}
                {analytics.monthly_exams.some((m) => m.count > 0) && (() => {
                  const recent = analytics.monthly_exams.slice(-6);
                  const maxCount = Math.max(...recent.map((m) => m.count), 1);
                  return (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-[var(--text-4)] uppercase tracking-wide">月別受験数</p>
                      <div className="flex items-end gap-1 h-8">
                        {recent.map((m) => (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                            <div
                              className="w-full rounded-t-sm bg-indigo-200 dark:bg-indigo-900/50 relative overflow-hidden"
                              style={{ height: `${Math.max((m.count / maxCount) * 32, m.count > 0 ? 4 : 0)}px` }}
                            >
                              {m.passed > 0 && (
                                <div
                                  className="absolute bottom-0 w-full bg-emerald-500/70 rounded-t-sm"
                                  style={{ height: `${(m.passed / m.count) * 100}%` }}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        {recent.map((m) => (
                          <p key={m.month} className="flex-1 text-center text-[9px] text-[var(--text-4)]">
                            {m.month.slice(5)}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Score trends */}
                {analytics.score_trends.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[var(--text-4)] uppercase tracking-wide">最近のスコア</p>
                    {analytics.score_trends.slice(0, 3).map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <p className="flex-1 text-[11px] text-[var(--text-3)] truncate">{s.qualification_name}</p>
                        <p className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 tabular-nums shrink-0">
                          {s.score} <span className="font-normal text-[var(--text-4)]">{s.unit}</span>
                        </p>
                        <p className="text-[10px] text-[var(--text-4)] shrink-0 w-12 text-right">
                          {new Date(s.taken_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {analytics.exam_stats.total === 0 && (
                  <p className="text-[12px] text-[var(--text-3)] text-center py-2">
                    受験結果を記録すると分析が表示されます
                  </p>
                )}
              </div>
            ) : (
              <div className="card overflow-hidden">
                <PremiumFeatureGate
                  compact
                  title="学習進捗分析"
                  description="合格率・カテゴリ別成績をグラフで確認できます"
                />
              </div>
            )}
          </section>
        )}

        {/* ── Upcoming Exams ───────────────────────── */}
        {upcoming.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--text-3)]" />
                <h2 className="text-[14px] font-extrabold text-[var(--text-1)]">今後90日の試験</h2>
              </div>
              <Link to={ROUTES.CALENDAR} className="text-[12px] text-indigo-600 dark:text-indigo-400 font-semibold
                                                    flex items-center gap-0.5">
                カレンダー <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {upcoming.map(({ qual, date, days }) => (
                <Link
                  key={qual.id + date}
                  to={ROUTES.QUALIFICATION_DETAIL(qual.id)}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--surface)]
                             border border-[var(--border)] active:scale-[0.99] transition-transform"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-[var(--text-3)] leading-none">
                      {new Date(date).getMonth() + 1}月
                    </span>
                    <span className="text-[16px] font-extrabold text-[var(--text-1)] leading-none tabular-nums">
                      {new Date(date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[var(--text-1)] truncate">{qual.name}</p>
                    <p className="text-[11px] text-[var(--text-2)] mt-0.5">
                      {qual.sub_category}{qual.exam_fee ? ` · ${qual.exam_fee}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      'text-[11px] font-bold px-2 py-0.5 rounded-full',
                      days <= 7 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                               : days <= 30 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                               : 'bg-[var(--surface-2)] text-[var(--text-3)]'
                    )}>
                      {days === 0 ? '今日' : `${days}日後`}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--text-4)]" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {upcoming.length === 0 && myPlans.length === 0 && (
          <div className="card p-8 text-center">
            <Calendar className="w-10 h-10 text-[var(--text-4)] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[14px] font-semibold text-[var(--text-2)]">今後90日間に予定された試験はありません</p>
            <p className="text-[12px] text-[var(--text-3)] mt-1">
              資格の詳細ページから受験予定を追加できます
            </p>
          </div>
        )}

        {/* ── Quick Actions ────────────────────────── */}
        <section>
          <h2 className="text-[13px] font-bold text-[var(--text-3)] mb-3 flex items-center gap-2 uppercase tracking-[0.08em]">
            <TrendingUp className="w-3.5 h-3.5" />
            クイックアクション
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            <Link to={ROUTES.LIST}
              className="card p-4 flex items-center gap-3 active:scale-[0.97] transition-all duration-200 group hover:border-indigo-200 dark:hover:border-indigo-600/50">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/25
                              flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 dark:group-hover:bg-indigo-500/35 transition-colors">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[var(--text-1)]">資格一覧</p>
                <p className="text-[11px] text-[var(--text-2)]">{qualifications.length}件</p>
              </div>
            </Link>

            <Link to={ROUTES.ROADMAP}
              className="card p-4 flex items-center gap-3 active:scale-[0.97] transition-all duration-200 group hover:border-emerald-200 dark:hover:border-emerald-600/50">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/25
                              flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 dark:group-hover:bg-emerald-500/35 transition-colors">
                <MapIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[var(--text-1)]">ロードマップ</p>
                <p className="text-[11px] text-[var(--text-2)]">取得ルート</p>
              </div>
            </Link>

            {user ? (
              <>
                <Link to={ROUTES.HELD}
                  className="card p-4 flex items-center gap-3 active:scale-[0.97] transition-all duration-200 group hover:border-amber-200 dark:hover:border-amber-600/50">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/25
                                  flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 dark:group-hover:bg-amber-500/35 transition-colors">
                    <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[var(--text-1)]">保有資格</p>
                    <p className="text-[11px] text-[var(--text-2)]">{heldCount}件取得</p>
                  </div>
                </Link>

                <Link to={ROUTES.WISHLIST}
                  className="card p-4 flex items-center gap-3 active:scale-[0.97] transition-all duration-200 group hover:border-pink-200 dark:hover:border-pink-600/50">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/10 dark:bg-pink-500/25
                                  flex items-center justify-center shrink-0 group-hover:bg-pink-500/20 dark:group-hover:bg-pink-500/35 transition-colors">
                    <Star className="w-4 h-4 text-pink-600 dark:text-pink-300" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[var(--text-1)]">挑戦リスト</p>
                    <p className="text-[11px] text-[var(--text-2)]">{wishlistCount}件計画中</p>
                  </div>
                </Link>
              </>
            ) : (
              <Link to={ROUTES.LOGIN}
                className="card p-4 flex items-center gap-3 active:scale-[0.97] transition-all duration-200 col-span-2
                           border-dashed border-indigo-200 dark:border-indigo-700/40">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400">ログインして全機能を使う</p>
                  <p className="text-[11px] text-[var(--text-3)]">保有資格・挑戦リスト・カレンダー</p>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0" />
              </Link>
            )}
          </div>
        </section>

        {/* ── Today's Date ─────────────────────────── */}
        <div className="text-center pb-2">
          <p className="text-[11px] text-[var(--text-4)]">
            {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
        </div>
      </div>
    </div>
  );
}
