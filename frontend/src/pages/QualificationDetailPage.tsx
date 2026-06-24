import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, Trophy, Star,
  Plus, Trash2, TrendingUp, ChevronRight, CalendarPlus, CalendarCheck,
  CalendarDays, Pencil, Check, X, CheckCircle2, XCircle,
  Sparkles, ChevronDown, Loader2, Clock,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ScheduleInfo } from '@/features/qualifications/components/ScheduleInfo';
import { useQualificationDetail } from '@/features/qualifications/hooks/useQualifications';
import { useHeldQualifications } from '@/contexts/HeldQualificationsContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { scoreService } from '@/services/scoreService';
import { planService } from '@/services/planService';
import { heldService } from '@/services/heldService';
import type { ScoreEntry, ScoreSectionDef } from '@/services/scoreService';
import type { ExamPlanForQual } from '@/services/planService';
import type { HeldDetail } from '@/services/heldService';
import { subscriptionService } from '@/services/subscriptionService';
import { apiClient } from '@/services/api';
import { PremiumFeatureGate } from '@/components/premium/PremiumFeatureGate';
import { useToast } from '@/contexts/ToastContext';
import { getLevelConfig } from '@/utils/level';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';
import axios from 'axios';

interface StudyPhase {
  phase: number;
  name: string;
  duration_days: number;
  start_date: string;
  end_date: string;
  daily_hours: number;
  tasks: string[];
}

interface StudyPlanData {
  qualification_name: string;
  exam_date: string;
  days_remaining: number;
  total_study_hours: number;
  phases: StudyPhase[];
  tips: string[];
}

function extractLimitMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const apiErr = err.response?.data?.error;
    if (apiErr?.code === 'LIMIT_EXCEEDED') {
      return apiErr.message ?? fallback;
    }
  }
  return fallback;
}

/* ── Mini score chart ────────────────────────────────────────── */
function ScoreChart({ entries, unit, max }: { entries: ScoreEntry[]; unit: string; max: string | null }) {
  if (entries.length < 2) return null;
  const nums = entries.map((e) => parseFloat(e.score) || 0);
  const parsedMax = max ? parseFloat(max) : NaN;
  const maxVal = !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : Math.max(...nums) * 1.1;
  const minVal = Math.max(0, Math.min(...nums) - (maxVal - Math.min(...nums)) * 0.1);
  const range = maxVal - minVal || 1;

  const W = 280; const H = 80;
  const pad = 8;
  const xs = entries.map((_, i) => pad + (i / (entries.length - 1)) * (W - pad * 2));
  const ys = nums.map((n) => H - pad - ((n - minVal) / range) * (H - pad * 2));

  const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const areaPath = [
    `M ${xs[0]},${H - pad}`,
    ...xs.map((x, i) => `L ${x},${ys[i]}`),
    `L ${xs[xs.length - 1]},${H - pad}`,
    'Z',
  ].join(' ');

  const latest = nums[nums.length - 1];
  const prev = nums[nums.length - 2];
  const diff = latest - prev;

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[22px] font-extrabold text-[var(--text-1)] tabular-nums">{latest}</span>
          <span className="text-[12px] text-[var(--text-3)] ml-1">{unit}</span>
        </div>
        <span className={cn(
          'text-[12px] font-bold',
          diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-400' : 'text-[var(--text-3)]'
        )}>
          {diff > 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0)}
          <span className="text-[10px] font-normal ml-0.5">前回比</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16">
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#scoreGrad)" />
        <polyline
          points={polyline}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r={i === xs.length - 1 ? 4 : 2.5}
            fill={i === xs.length - 1 ? '#6366f1' : '#818cf8'}
            stroke="white" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}

/* ── Add score form ──────────────────────────────────────────── */
function AddScoreForm({
  qualId, unit, sectionDefs, onSuccess,
}: {
  qualId: number;
  unit: string;
  sectionDefs: ScoreSectionDef[];
  onSuccess: () => void;
}) {
  const [score,       setScore]   = useState('');
  const [takenAt,     setTakenAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes,       setNotes]   = useState('');
  const [sectionVals, setSectionVals] = useState<Record<string, string>>({});
  const { showToast } = useToast();
  const queryClient   = useQueryClient();

  const hasSections = sectionDefs.length > 0;

  const mutation = useMutation({
    mutationFn: () => scoreService.addScore(
      qualId, score, takenAt, notes || undefined,
      hasSections ? sectionVals : undefined
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scores', qualId] });
      showToast('success', 'スコアを記録しました');
      onSuccess();
    },
    onError: (err) => showToast('error', extractLimitMessage(err, '記録に失敗しました')),
  });

  return (
    <div className="space-y-3 p-3.5 bg-[var(--surface-2)] rounded-2xl">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-3)] mb-1">
            {hasSections ? `合計スコア (${unit})` : `スコア (${unit})`}
          </label>
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="例: 750"
            className="input-base text-sm py-2"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-3)] mb-1">受験日</label>
          <input
            type="date"
            value={takenAt}
            onChange={(e) => setTakenAt(e.target.value)}
            className="input-base text-sm py-2"
          />
        </div>
      </div>

      {hasSections && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-[var(--text-3)]">セクション別スコア（任意）</p>
          <div className="grid grid-cols-2 gap-2">
            {sectionDefs.map((def) => (
              <div key={def.section_key}>
                <label className="block text-[11px] text-[var(--text-3)] mb-1">
                  {def.section_label}
                  {def.max_score !== null && (
                    <span className="text-[var(--text-4)] ml-1">/ {def.max_score}</span>
                  )}
                </label>
                <input
                  type="number"
                  value={sectionVals[def.section_key] ?? ''}
                  onChange={(e) => setSectionVals((prev) => ({ ...prev, [def.section_key]: e.target.value }))}
                  placeholder={def.max_score !== null ? `0–${def.max_score}` : '–'}
                  className="input-base text-sm py-2"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-[11px] font-bold text-[var(--text-3)] mb-1">メモ（任意）</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="例: 本番、模擬試験..."
          className="input-base text-sm py-2"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={!score || !takenAt || mutation.isPending}
          className="btn-primary flex-1 py-2 text-sm"
        >
          {mutation.isPending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : '記録する'}
        </button>
        <button
          onClick={onSuccess}
          className="btn-secondary px-4 py-2 text-sm"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

/* ── Exam plan section ───────────────────────────────────────── */
function ExamPlanSection({
  qualId, officialExamDate, isPremium,
}: {
  qualId: number;
  officialExamDate?: string | null;
  isPremium?: boolean;
}) {
  const [showForm,  setShowForm]  = useState(false);
  const [date,      setDate]      = useState('');
  const [notes,     setNotes]     = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate,  setEditDate]  = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [showStudyPlanForm, setShowStudyPlanForm] = useState(false);
  const [confirmDeleteId,   setConfirmDeleteId]   = useState<number | null>(null);
  const [studyPlanDate,     setStudyPlanDate]     = useState('');
  const [studyPlanLoading,  setStudyPlanLoading]  = useState(false);
  const [studyPlan,         setStudyPlan]         = useState<StudyPlanData | null>(null);
  const [expandedPhase,     setExpandedPhase]     = useState<number | null>(null);
  const [checkedTasks,      setCheckedTasks]      = useState<Record<number, number[]>>({});

  // Load persisted study plan on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`studyplan-data-${qualId}`);
      if (saved) {
        const parsed: StudyPlanData = JSON.parse(saved);
        setStudyPlan(parsed);
        setExpandedPhase(1);
      }
    } catch { /* ignore corrupt data */ }
  }, [qualId]);

  // Load task checkbox state whenever the active plan changes
  useEffect(() => {
    if (!studyPlan) { setCheckedTasks({}); return; }
    try {
      const key = `studyplan-tasks-${qualId}-${studyPlan.exam_date}`;
      const stored = localStorage.getItem(key);
      setCheckedTasks(stored ? JSON.parse(stored) : {});
    } catch { setCheckedTasks({}); }
  }, [studyPlan, qualId]);

  const { showToast } = useToast();
  const queryClient   = useQueryClient();

  const { data: plans = [], isError: plansError, refetch: refetchPlans } = useQuery<ExamPlanForQual[]>({
    queryKey: ['plans', qualId],
    queryFn:  () => planService.getForQualification(qualId),
  });

  const addMutation = useMutation({
    mutationFn: () => planService.add(qualId, date, notes || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', qualId] });
      queryClient.invalidateQueries({ queryKey: ['exam-plans-all'] });
      showToast('success', '受験予定を追加しました');
      setShowForm(false); setDate(''); setNotes('');
    },
    onError: (err) => showToast('error', extractLimitMessage(err, '追加に失敗しました')),
  });

  const updateMutation = useMutation({
    mutationFn: () => planService.update(editingId!, editDate, editNotes || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', qualId] });
      queryClient.invalidateQueries({ queryKey: ['exam-plans-all'] });
      showToast('success', '更新しました');
      setEditingId(null);
    },
    onError: () => showToast('error', '更新に失敗しました'),
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: number) => planService.delete(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', qualId] });
      queryClient.invalidateQueries({ queryKey: ['exam-plans-all'] });
      showToast('success', '削除しました');
    },
  });

  async function generateStudyPlan() {
    if (!studyPlanDate) return;
    setStudyPlanLoading(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: StudyPlanData }>(
        '/plans/study-plan/generate',
        { qualification_id: qualId, exam_date: studyPlanDate }
      );
      const plan = res.data.data;
      // Persist plan so it survives page navigation
      localStorage.setItem(`studyplan-data-${qualId}`, JSON.stringify(plan));
      // Clear old task state for a fresh plan
      localStorage.removeItem(`studyplan-tasks-${qualId}-${plan.exam_date}`);
      setStudyPlan(plan);
      setShowStudyPlanForm(false);
      setExpandedPhase(1);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        showToast('error', 'プレミアムプランへのアップグレードが必要です');
      } else {
        showToast('error', '学習計画の生成に失敗しました');
      }
    } finally {
      setStudyPlanLoading(false);
    }
  }

  function startEdit(plan: ExamPlanForQual) {
    setEditingId(plan.id);
    setEditDate(plan.planned_date);
    setEditNotes(plan.notes ?? '');
  }

  function daysUntil(dateStr: string) {
    const today = new Date(); today.setHours(0,0,0,0);
    const t = new Date(dateStr); t.setHours(0,0,0,0);
    return Math.round((t.getTime() - today.getTime()) / 86_400_000);
  }

  function toggleTask(phaseNum: number, taskIdx: number) {
    if (!studyPlan) return;
    setCheckedTasks((prev) => {
      const current = prev[phaseNum] ?? [];
      const next = current.includes(taskIdx)
        ? current.filter((i) => i !== taskIdx)
        : [...current, taskIdx];
      const updated = { ...prev, [phaseNum]: next };
      localStorage.setItem(`studyplan-tasks-${qualId}-${studyPlan.exam_date}`, JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[14px] font-extrabold text-[var(--text-1)] flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-teal-500" />
          受験予定
        </h2>
        {!showForm && (
          <button
            onClick={() => {
              if (officialExamDate) setDate(officialExamDate);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1 text-[12px] font-semibold
                       text-teal-600 dark:text-teal-400 hover:underline"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            予定を追加
          </button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3 p-3.5 bg-teal-50 dark:bg-teal-900/10
                        border border-teal-200 dark:border-teal-800/30 rounded-2xl mb-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-3)] mb-1">
                受験予定日
                {officialExamDate && date === officialExamDate && (
                  <span className="ml-1 text-teal-500">（公式日程）</span>
                )}
              </label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="input-base text-sm py-2" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-3)] mb-1">メモ（任意）</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="例: 第3回申込" className="input-base text-sm py-2" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => addMutation.mutate()} disabled={!date || addMutation.isPending}
              className="btn-primary flex-1 py-2 text-sm bg-teal-600 hover:bg-teal-700">
              {addMutation.isPending
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : '追加する'}
            </button>
            <button onClick={() => { setShowForm(false); setDate(''); setNotes(''); }}
              className="btn-secondary px-4 py-2 text-sm">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {plansError ? (
        <div className="text-center py-6">
          <p className="text-[12px] text-red-400 mb-2">受験予定の読み込みに失敗しました</p>
          <button
            onClick={() => refetchPlans()}
            className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            再試行
          </button>
        </div>
      ) : plans.length > 0 ? (
        <div className="space-y-2">
          {plans.map((plan) => {
            const days = daysUntil(plan.planned_date);
            const past = days < 0;
            const isEditing = editingId === plan.id;

            return (
              <div key={plan.id} className="rounded-xl bg-[var(--surface-2)] overflow-hidden">
                {isEditing ? (
                  <div className="p-3.5 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-3)] mb-1">受験日</label>
                        <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                          className="input-base text-sm py-2" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--text-3)] mb-1">メモ</label>
                        <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                          className="input-base text-sm py-2" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateMutation.mutate()} disabled={!editDate || updateMutation.isPending}
                        className="btn-primary flex-1 py-2 text-sm bg-teal-600 hover:bg-teal-700">
                        {updateMutation.isPending
                          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : <><Check className="w-3.5 h-3.5" />保存</>}
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-secondary px-4 py-2 text-sm">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0',
                      plan.result === 'passed' ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : plan.result === 'failed' ? 'bg-red-100 dark:bg-red-900/30'
                      : past ? 'bg-[var(--surface-3)]' : 'bg-teal-100 dark:bg-teal-900/30'
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
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[var(--text-1)]">
                        {new Date(plan.planned_date).toLocaleDateString('ja-JP', {
                          year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
                        })}
                      </p>
                      <p className={cn('text-[11px] font-semibold',
                        plan.result === 'passed' ? 'text-emerald-600 dark:text-emerald-400'
                        : plan.result === 'failed' ? 'text-red-500 dark:text-red-400'
                        : past ? 'text-[var(--text-4)]'
                             : days === 0 ? 'text-red-500'
                             : days <= 14 ? 'text-orange-500'
                             : 'text-teal-600 dark:text-teal-400')}>
                        {plan.result === 'passed' ? '合格'
                         : plan.result === 'failed' ? '不合格'
                         : past ? `${Math.abs(days)}日前` : days === 0 ? '今日' : `あと${days}日`}
                        {plan.notes ? ` · ${plan.notes}` : ''}
                      </p>
                    </div>
                    {plan.result === 'passed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : plan.result === 'failed' ? (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : null}
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEdit(plan)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center
                                   text-[var(--text-4)] hover:text-teal-500 hover:bg-teal-50
                                   dark:hover:bg-teal-900/20 transition-colors active:scale-90">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(plan.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center
                                   text-[var(--text-4)] hover:text-red-400 hover:bg-red-50
                                   dark:hover:bg-red-900/20 transition-colors active:scale-90">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                {/* インライン削除確認 */}
                {confirmDeleteId === plan.id && (
                  <div className="flex items-center justify-between px-3.5 py-2.5
                                  bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800/30">
                    <p className="text-[12px] font-semibold text-red-600 dark:text-red-400">
                      この受験予定を削除しますか？
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg
                                   text-[var(--text-3)] bg-[var(--surface)] hover:bg-[var(--surface-2)]
                                   transition-colors border border-[var(--border)]"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => { deleteMutation.mutate(plan.id); setConfirmDeleteId(null); }}
                        disabled={deleteMutation.isPending}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg
                                   bg-red-500 hover:bg-red-600 text-white transition-colors
                                   disabled:opacity-50"
                      >
                        削除する
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !showForm ? (
        <div className="text-center py-5">
          <CalendarCheck className="w-8 h-8 text-[var(--text-4)] mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-[12px] text-[var(--text-3)]">受験予定がまだ設定されていません</p>
        </div>
      ) : null}

      {/* ── Study plan generator ──────────────────── */}
      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-[13px] font-bold text-[var(--text-1)]">学習計画を自動作成</h3>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full
                           bg-amber-500/15 text-amber-600 dark:text-amber-400">Premium</span>
        </div>

        {isPremium === undefined ? (
          <div className="h-10 skeleton rounded-xl opacity-50" />
        ) : isPremium === false ? (
          <PremiumFeatureGate
            compact
            title="学習計画自動作成"
            description="試験日から逆算した学習スケジュールを自動生成します"
          />
        ) : studyPlan ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] text-[var(--text-3)]">
                  試験日：{new Date(studyPlan.exam_date).toLocaleDateString('ja-JP')}
                  　合計：約{studyPlan.total_study_hours}時間
                </p>
              </div>
              <button
                onClick={() => {
                  if (studyPlan) {
                    localStorage.removeItem(`studyplan-data-${qualId}`);
                    localStorage.removeItem(`studyplan-tasks-${qualId}-${studyPlan.exam_date}`);
                  }
                  setStudyPlan(null);
                  setShowStudyPlanForm(false);
                }}
                className="text-[11px] text-[var(--text-3)] hover:text-red-400 transition-colors"
              >
                クリア
              </button>
            </div>

            {studyPlan.phases.map((phase) => (
              <div key={phase.phase} className="rounded-2xl overflow-hidden border border-[var(--border)]">
                <button
                  onClick={() => setExpandedPhase(expandedPhase === phase.phase ? null : phase.phase)}
                  className="w-full flex items-center gap-3 p-3.5 bg-[var(--surface-2)]
                             hover:bg-[var(--surface-3)] transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-white">{phase.phase}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[var(--text-1)]">{phase.name}</p>
                    <p className="text-[11px] text-[var(--text-3)]">
                      {phase.duration_days}日間 · {phase.start_date} → {phase.end_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-indigo-500">
                      <Clock className="w-3 h-3" />{phase.daily_hours}h/日
                    </span>
                    <ChevronDown className={cn(
                      'w-4 h-4 text-[var(--text-4)] transition-transform',
                      expandedPhase === phase.phase && 'rotate-180'
                    )} />
                  </div>
                </button>
                {expandedPhase === phase.phase && (
                  <div className="bg-[var(--surface)] p-3.5 space-y-2">
                    {/* Per-phase progress bar */}
                    {(() => {
                      const done  = (checkedTasks[phase.phase] ?? []).length;
                      const total = phase.tasks.length;
                      return (
                        <div className="flex items-center gap-2 pb-1">
                          <div className="flex-1 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-[var(--text-3)] tabular-nums whitespace-nowrap">
                            {done}/{total}
                          </span>
                        </div>
                      );
                    })()}
                    <ul className="space-y-1.5">
                      {phase.tasks.map((task, i) => {
                        const isChecked = (checkedTasks[phase.phase] ?? []).includes(i);
                        return (
                          <li
                            key={i}
                            onClick={() => toggleTask(phase.phase, i)}
                            className="flex items-start gap-2 text-[12px] cursor-pointer select-none group"
                          >
                            <div className={cn(
                              'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all',
                              isChecked
                                ? 'bg-indigo-500 border-indigo-500'
                                : 'border-[var(--border)] bg-[var(--surface)] group-hover:border-indigo-300 dark:group-hover:border-indigo-600'
                            )}>
                              {isChecked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                            </div>
                            <span className={cn(
                              'transition-colors',
                              isChecked
                                ? 'line-through text-[var(--text-4)]'
                                : 'text-[var(--text-2)] group-hover:text-[var(--text-1)]'
                            )}>
                              {task}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 space-y-1">
              {studyPlan.tips.map((tip, i) => (
                <p key={i} className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                  <span className="shrink-0">💡</span>{tip}
                </p>
              ))}
            </div>
          </div>
        ) : showStudyPlanForm ? (
          <div className="space-y-3 p-3.5 bg-[var(--surface-2)] rounded-2xl">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-3)] mb-1">試験予定日</label>
              <input
                type="date"
                value={studyPlanDate}
                onChange={(e) => setStudyPlanDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="input-base text-sm py-2"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={generateStudyPlan}
                disabled={!studyPlanDate || studyPlanLoading}
                className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-1.5"
              >
                {studyPlanLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Sparkles className="w-3.5 h-3.5" />生成する</>}
              </button>
              <button
                onClick={() => setShowStudyPlanForm(false)}
                className="btn-secondary px-4 py-2 text-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setStudyPlanDate(officialExamDate ?? '');
              setShowStudyPlanForm(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                       bg-gradient-to-r from-indigo-500/10 to-violet-500/10
                       border border-indigo-500/20 text-[13px] font-semibold
                       text-indigo-600 dark:text-indigo-400
                       hover:from-indigo-500/15 hover:to-violet-500/15 transition-colors active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            学習計画を自動作成する
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function QualificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qualId = Number(id);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { heldIds, toggleHeld } = useHeldQualifications();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const [showAddScore, setShowAddScore] = useState(false);

  const { data: qual, isLoading, isError, refetch } = useQualificationDetail(qualId);

  const { data: userPlans = [] } = useQuery<ExamPlanForQual[]>({
    queryKey: ['plans', qualId],
    queryFn:  () => planService.getForQualification(qualId),
    enabled:  !!user,
  });

  const { data: scoreHistory = [], isError: scoresError, refetch: refetchScores } = useQuery({
    queryKey: ['scores', qualId],
    queryFn: () => scoreService.getHistory(qualId),
    enabled: Boolean(user && qual?.score_enabled),
  });

  const { data: scoreSectionDefs = [] } = useQuery({
    queryKey: ['score-section-defs', qualId],
    queryFn: () => scoreService.getSectionDefs(qualId),
    enabled: Boolean(qual?.score_enabled),
    staleTime: Infinity,
  });

  const { data: heldDetails = [] } = useQuery<HeldDetail[]>({
    queryKey: ['held-details'],
    queryFn:  heldService.getDetails,
    enabled:  !!user,
  });
  const myHeldDetail = heldDetails.find((d) => d.qualification_id === qualId) ?? null;

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn:  subscriptionService.getStatus,
    enabled:  !!user,
  });
  // undefined = still loading; false = confirmed not premium; true = premium
  const isPremium = user
    ? (statusLoading && !statusData ? undefined : (statusData?.is_premium ?? false))
    : false;

  const deleteScoreMutation = useMutation({
    mutationFn: (scoreId: number) => scoreService.deleteScore(scoreId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scores', qualId] });
      showToast('success', '削除しました');
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError || !qual) return <ErrorState onRetry={refetch} />;

  const config = getLevelConfig(qual.name, qual.main_category);
  const isHeld = heldIds.has(qualId);
  const isWish = isWishlisted(qualId);

  return (
    <div className="min-h-screen bg-[var(--bg)] page-enter">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to={ROUTES.LIST}
            className="w-8 h-8 rounded-xl bg-[var(--surface-2)] flex items-center justify-center
                       active:scale-90 transition-transform shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--text-2)]" />
          </Link>
          <h1 className="flex-1 text-[14px] font-bold text-[var(--text-1)] truncate">{qual.name}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* ── Overview card ─────────────────────── */}
        <div className="card overflow-hidden">
          {/* Level stripe */}
          <div className="h-1.5 w-full" style={{ backgroundColor: config.color }} />

          <div className="p-5">
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg"
                style={{ backgroundColor: config.color + '20', color: config.color }}>
                {config.label}
              </span>
              <span className="text-[11px] font-semibold px-2 py-1 rounded-lg
                               bg-[var(--surface-2)] text-[var(--text-3)]">
                {qual.main_category}
              </span>
              <span className="text-[11px] font-semibold px-2 py-1 rounded-lg
                               bg-[var(--surface-2)] text-[var(--text-3)]">
                {qual.sub_category}
              </span>
              {qual.requires_renewal ? (
                <span className="text-[11px] font-semibold px-2 py-1 rounded-lg
                                 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  更新あり
                </span>
              ) : null}
            </div>

            <h1 className="text-[20px] font-extrabold text-[var(--text-1)] leading-tight mb-3">
              {qual.name}
            </h1>

            {qual.description && (
              <p className="text-[13px] text-[var(--text-2)] leading-relaxed mb-4">
                {qual.description}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {qual.official_url && (
                <a
                  href={qual.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold
                             text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  公式サイト
                </a>
              )}
            </div>
          </div>

          {/* Held / Wishlist buttons */}
          {user && (
            <div className="border-t border-[var(--border)]">
              <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
              <button
                onClick={() => toggleHeld(qualId)}
                className={cn(
                  'flex items-center justify-center gap-2 py-3.5 text-[13px] font-bold transition-colors active:scale-[0.97]',
                  isHeld
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]'
                )}
              >
                <Trophy className={cn('w-4 h-4', isHeld && 'fill-emerald-500 text-emerald-500')} strokeWidth={isHeld ? 2.5 : 2} />
                {isHeld ? '保有済み ✓' : '保有済みに追加'}
              </button>
              <button
                onClick={() => toggleWishlist(qualId)}
                className={cn(
                  'flex items-center justify-center gap-2 py-3.5 text-[13px] font-bold transition-colors active:scale-[0.97]',
                  isWish
                    ? 'text-pink-600 dark:text-pink-400 bg-pink-50/50 dark:bg-pink-900/10'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]'
                )}
              >
                <Star className={cn('w-4 h-4', isWish && 'fill-pink-500 text-pink-500')} strokeWidth={isWish ? 2.5 : 2} />
                {isWish ? '挑戦リスト済み' : '挑戦リストに追加'}
              </button>
            </div>
            {/* 取得日表示 */}
            {isHeld && myHeldDetail?.acquired_at && (
              <div className="flex items-center justify-center gap-1.5 py-2
                              bg-emerald-50/50 dark:bg-emerald-900/10
                              border-t border-emerald-100 dark:border-emerald-800/30">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[12px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  取得日：{new Date(myHeldDetail.acquired_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            )}
            </div>
          )}
        </div>

        {/* ── Schedule card ─────────────────────── */}
        <div className="card p-5">
          <h2 className="text-[14px] font-extrabold text-[var(--text-1)] mb-4 flex items-center gap-2">
            <span className="text-[16px]">📅</span> 試験スケジュール
          </h2>
          <ScheduleInfo
            schedules={qual.schedules ?? []}
            requiresRenewal={qual.requires_renewal}
            renewalPeriodYears={qual.renewal_period_years}
            userPlans={user ? userPlans : []}
          />
        </div>

        {/* ── Exam plan ─────────────────────────── */}
        {user && (
          <ExamPlanSection
            qualId={qualId}
            officialExamDate={qual.schedules?.[0]?.exam_date ?? null}
            isPremium={isPremium}
          />
        )}

        {/* ── Score history (score-enabled only) ── */}
        {user && Boolean(qual.score_enabled) && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-extrabold text-[var(--text-1)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                スコア履歴
                {qual.score_max && (
                  <span className="text-[11px] font-normal text-[var(--text-3)]">/ {qual.score_max} {qual.score_unit}</span>
                )}
              </h2>
              {!showAddScore && (
                <button
                  onClick={() => setShowAddScore(true)}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold
                             text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  記録を追加
                </button>
              )}
            </div>

            {showAddScore && (
              <div className="mb-4">
                <AddScoreForm
                  qualId={qualId}
                  unit={qual.score_unit ?? '点'}
                  sectionDefs={scoreSectionDefs}
                  onSuccess={() => setShowAddScore(false)}
                />
              </div>
            )}

            {/* グラフはプレミアム限定 */}
            {scoreHistory.length >= 2 && isPremium && (
              <div className="mb-4">
                <ScoreChart
                  entries={scoreHistory}
                  unit={qual.score_unit ?? '点'}
                  max={qual.score_max}
                />
              </div>
            )}
            {scoreHistory.length >= 2 && !isPremium && (
              <div className="mb-4">
                <PremiumFeatureGate
                  compact
                  title="スコア推移グラフ"
                  description="プレミアムでスコアの推移をグラフで確認できます"
                />
              </div>
            )}

            {scoresError ? (
              <div className="text-center py-6">
                <p className="text-[12px] text-red-400 mb-2">スコア履歴の読み込みに失敗しました</p>
                <button
                  onClick={() => refetchScores()}
                  className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  再試行
                </button>
              </div>
            ) : scoreHistory.length > 0 ? (
              <div className="space-y-2">
                {[...scoreHistory].reverse().map((entry) => (
                  <div key={entry.id} className="p-3 rounded-xl bg-[var(--surface-2)]">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[16px] font-extrabold text-[var(--text-1)] tabular-nums">
                            {entry.score}
                          </span>
                          <span className="text-[11px] text-[var(--text-3)]">{qual.score_unit}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-3)]">
                          {new Date(entry.taken_at).toLocaleDateString('ja-JP')}
                          {entry.notes ? ` · ${entry.notes}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteScoreMutation.mutate(entry.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center
                                   text-[var(--text-4)] hover:text-red-400 hover:bg-red-50
                                   dark:hover:bg-red-900/20 transition-colors active:scale-90"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* セクション別スコア内訳 */}
                    {entry.section_values && scoreSectionDefs.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[var(--border)] grid grid-cols-2 gap-x-4 gap-y-1">
                        {scoreSectionDefs.map((def) => {
                          const val = entry.section_values![def.section_key];
                          if (!val) return null;
                          const num = parseFloat(val);
                          const pct = def.max_score !== null ? (num / def.max_score) * 100 : null;
                          return (
                            <div key={def.section_key} className="flex flex-col gap-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-[var(--text-3)]">{def.section_label}</span>
                                <span className="text-[11px] font-bold text-[var(--text-2)] tabular-nums">
                                  {val}
                                  {def.max_score !== null && (
                                    <span className="text-[9px] font-normal text-[var(--text-4)]">/{def.max_score}</span>
                                  )}
                                </span>
                              </div>
                              {pct !== null && (
                                <div className="h-1 rounded-full bg-[var(--surface-3)] overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-indigo-500/70 transition-all"
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : !showAddScore ? (
              <div className="text-center py-6">
                <TrendingUp className="w-8 h-8 text-[var(--text-4)] mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-[12px] text-[var(--text-3)]">スコアの記録がまだありません</p>
                <button
                  onClick={() => setShowAddScore(true)}
                  className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold
                             text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  初回スコアを記録する
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Back to list ──────────────────────── */}
        <Link
          to={ROUTES.LIST}
          className="flex items-center gap-2 text-[13px] text-[var(--text-3)] hover:text-[var(--text-1)]
                     transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          資格一覧に戻る
          <ChevronRight className="w-3.5 h-3.5 ml-auto" />
        </Link>
      </div>
    </div>
  );
}
