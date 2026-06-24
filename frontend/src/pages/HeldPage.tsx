import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Trophy, BookOpen, ChevronRight, BarChart3, Award,
  PenLine, Check, CalendarDays, X, Star, Plus, Search,
} from 'lucide-react';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useToast } from '@/contexts/ToastContext';
import { useQualifications } from '@/features/qualifications/hooks/useQualifications';
import { useHeldQualifications } from '@/contexts/HeldQualificationsContext';
import { heldService } from '@/services/heldService';
import type { HeldDetail } from '@/services/heldService';
import { useEntitlements } from '@/hooks/useEntitlements';
import { PremiumFeatureGate } from '@/components/premium/PremiumFeatureGate';
import { ROUTES } from '@/constants/routes';
import { LEVEL_CONFIG } from '@/constants/levels';
import { getLevelConfig } from '@/utils/level';
import { MAIN_CATEGORY_COLORS } from '@/constants/categories';
import { cn } from '@/utils/cn';
import type { QualificationWithSchedule } from '@/types/qualification';

export default function HeldPage() {
  const { heldIds, count } = useHeldQualifications();
  const { data: allData, isLoading } = useQualifications({});
  const queryClient = useQueryClient();
  const { isAtLimit, usageLabel, isPremium, entitlements } = useEntitlements();

  const { data: details = [] } = useQuery<HeldDetail[]>({
    queryKey: ['held-details'],
    queryFn:  heldService.getDetails,
  });

  const detailMap         = new Map(details.map((d) => [d.qualification_id, d]));
  const heldQualifications = allData?.filter((q) => heldIds.has(q.id)) ?? [];

  const byCategory = {
    '国家資格': heldQualifications.filter((q) => q.main_category === '国家資格').length,
    '民間資格': heldQualifications.filter((q) => q.main_category === '民間資格').length,
    '公的資格': heldQualifications.filter((q) => q.main_category === '公的資格').length,
  };

  const byLevel = Object.fromEntries(
    Object.keys(LEVEL_CONFIG).map((lv) => [
      lv,
      heldQualifications.filter((q) => getLevelConfig(q.name, q.main_category).level === lv).length,
    ])
  );

  function invalidateDetails() {
    queryClient.invalidateQueries({ queryKey: ['held-details'] });
  }

  return (
    <div className="min-h-screen page-enter">
      {/* ── App-style header ──────────────────────── */}
      <div className="sticky top-0 z-20 bg-[var(--bg)] border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold text-[var(--text-1)] leading-none">
              保有資格
            </h1>
            <p className="text-[11px] text-[var(--text-3)] mt-0.5">{count} 件取得済み</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-4">
        {isLoading ? (
          <LoadingState />
        ) : count === 0 ? (
          <div className="space-y-5">
            {isAtLimit('max_held_qualifications')
              ? <PremiumFeatureGate
                  title="保有資格の上限に達しました"
                  description="プレミアムプランにアップグレードすると、保有資格を無制限に登録できます。"
                  current={entitlements.usage.held_qualifications}
                  max={entitlements.max_held_qualifications ?? undefined}
                />
              : <AddHeldPanel allData={allData ?? []} heldIds={heldIds} onAdded={invalidateDetails} />}
            <EmptyHeld />
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── Add held panel or limit gate ── */}
            {isAtLimit('max_held_qualifications') && !isPremium ? (
              <PremiumFeatureGate
                compact
                title="保有資格の上限に達しました"
                current={entitlements.usage.held_qualifications}
                max={entitlements.max_held_qualifications ?? undefined}
              />
            ) : (
              <AddHeldPanel allData={allData ?? []} heldIds={heldIds} onAdded={invalidateDetails} />
            )}
            {/* 上限に近い場合の警告（残り1件） */}
            {!isAtLimit('max_held_qualifications') && !isPremium &&
              entitlements.max_held_qualifications !== null &&
              entitlements.usage.held_qualifications >= (entitlements.max_held_qualifications ?? 0) - 1 &&
              entitlements.usage.held_qualifications > 0 && (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl
                              bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30">
                <p className="text-[12px] text-amber-700 dark:text-amber-400">
                  保有資格 {usageLabel('max_held_qualifications')} — あと1件で上限です
                </p>
                <Link to={ROUTES.PRICING} className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline">
                  プランを見る
                </Link>
              </div>
            )}

            {/* ── Stats horizontal scroll ── */}
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-0.5">
              <StatCard
                icon="🏆"
                label="総取得数"
                value={count}
                gradient="from-indigo-500 to-violet-600"
              />
              <StatCard
                icon="🏛️"
                label="国家資格"
                value={byCategory['国家資格']}
                gradient="from-blue-500 to-cyan-500"
              />
              <StatCard
                icon="🏢"
                label="民間資格"
                value={byCategory['民間資格']}
                gradient="from-violet-500 to-purple-600"
              />
              <StatCard
                icon="📋"
                label="公的資格"
                value={byCategory['公的資格']}
                gradient="from-emerald-500 to-teal-600"
              />
            </div>

            {/* ── Level distribution ── */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3.5">
                <BarChart3 className="w-4 h-4 text-[var(--text-3)]" />
                <h2 className="text-[13px] font-bold text-[var(--text-1)]">難易度分布</h2>
              </div>
              <div className="space-y-2">
                {Object.entries(LEVEL_CONFIG).map(([lv, cfg]) => {
                  const lvCount = byLevel[lv] ?? 0;
                  const pct = count > 0 ? (lvCount / count) * 100 : 0;
                  return (
                    <div key={lv} className="flex items-center gap-3">
                      <div className="w-14 flex items-center gap-1 shrink-0">
                        <div className="flex gap-[2px]">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={cn('w-1 h-1 rounded-full', i < cfg.stars ? cfg.dotClass : 'bg-[var(--border)]')}
                            />
                          ))}
                        </div>
                        <span className={cn('text-[10px] font-semibold', cfg.textClass)}>{cfg.label}</span>
                      </div>
                      <div className="flex-1 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700', cfg.dotClass)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-[var(--text-2)] w-4 text-right tabular-nums">
                        {lvCount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Qualification list ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-[var(--text-3)]" />
                <h2 className="text-[13px] font-bold text-[var(--text-1)]">
                  一覧 <span className="font-normal text-[var(--text-3)]">{count} 件</span>
                </h2>
              </div>

              <div className="space-y-2">
                {heldQualifications.map((q) => (
                  <HeldItemRow
                    key={q.id}
                    qualification={q}
                    detail={detailMap.get(q.id) ?? null}
                    onUpdated={invalidateDetails}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}

/* ── AddHeldPanel ────────────────────────────────────── */

function AddHeldPanel({
  allData,
  heldIds,
  onAdded,
}: {
  allData: QualificationWithSchedule[];
  heldIds: Set<number>;
  onAdded: () => void;
}) {
  const { toggleHeld } = useHeldQualifications();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<QualificationWithSchedule | null>(null);
  const [dateVal, setDateVal] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allData
      .filter((qual) => !heldIds.has(qual.id) && qual.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, allData, heldIds]);

  function openPanel() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function reset() {
    setOpen(false);
    setQuery('');
    setSelected(null);
    setDateVal('');
  }

  async function handleAdd() {
    if (!selected) return;
    setSaving(true);
    try {
      toggleHeld(selected.id);
      if (dateVal) {
        await heldService.updateAcquiredAt(selected.id, dateVal);
      }
      onAdded();
      reset();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={openPanel}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl
                   border-2 border-dashed border-emerald-300 dark:border-emerald-700/50
                   text-emerald-600 dark:text-emerald-400 font-semibold text-[13px]
                   hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors"
      >
        <Plus className="w-4 h-4" />
        合格を直接追加
      </button>
    );
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-500" />
          <span className="text-[13px] font-bold text-[var(--text-1)]">合格を直接追加</span>
        </div>
        <button onClick={reset} className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-3)]">
          <X className="w-4 h-4" />
        </button>
      </div>

      {selected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20
                          border border-emerald-200 dark:border-emerald-700/40">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[var(--text-1)] truncate">{selected.name}</p>
              <p className="text-[11px] text-[var(--text-3)]">{selected.main_category} · {selected.sub_category}</p>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-3)]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[var(--text-3)] shrink-0" />
            <span className="text-[12px] text-[var(--text-2)] shrink-0">取得日（任意）</span>
            <input
              type="date"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="flex-1 px-2 py-1.5 rounded-xl border border-[var(--border)]
                         bg-[var(--surface)] text-[13px] text-[var(--text-1)]
                         focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700
                       text-white font-bold text-[13px] transition-colors disabled:opacity-50
                       flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            保有資格に追加
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-4)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="資格名で検索..."
            className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-[var(--border)]
                       bg-[var(--surface)] text-[13px] text-[var(--text-1)]
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-[var(--text-4)]"
          />
          {results.length > 0 && (
            <div className="mt-2 space-y-1">
              {results.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setSelected(q)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                             hover:bg-[var(--surface-2)] transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--text-1)] truncate">{q.name}</p>
                    <p className="text-[11px] text-[var(--text-3)]">{q.main_category}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-4)] shrink-0" />
                </button>
              ))}
            </div>
          )}
          {query.trim() && results.length === 0 && (
            <p className="mt-2 text-[12px] text-[var(--text-3)] text-center py-2">
              該当する資格が見つかりません
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── HeldItemRow ──────────────────────────────────────── */

function HeldItemRow({
  qualification: q,
  detail,
  onUpdated,
}: {
  qualification: QualificationWithSchedule;
  detail: HeldDetail | null;
  onUpdated: () => void;
}) {
  const [editScore, setEditScore] = useState(false);
  const [scoreVal,  setScoreVal]  = useState(detail?.score ?? '');
  const [editDate,  setEditDate]  = useState(false);
  const [dateVal,   setDateVal]   = useState(detail?.acquired_at ?? '');
  const [saving, setSaving] = useState<'score' | 'date' | null>(null);
  const [saved,  setSaved]  = useState<'score' | 'date' | null>(null);
  const { showToast } = useToast();

  const lv            = getLevelConfig(q.name, q.main_category);
  const scoreEnabled  = (q as { score_enabled?: number }).score_enabled === 1;
  const scoreUnit     = (q as { score_unit?: string }).score_unit ?? '点';
  const scoreMax      = (q as { score_max?: string }).score_max;
  const displayDate   = detail?.acquired_at ?? dateVal;

  async function saveScore() {
    if (!scoreVal.trim()) return;
    setSaving('score');
    await heldService.updateScore(q.id, scoreVal.trim());
    onUpdated();
    setSaving(null); setSaved('score'); setEditScore(false);
    setTimeout(() => setSaved(null), 2000);
  }

  async function saveDate() {
    setSaving('date');
    await heldService.updateAcquiredAt(q.id, dateVal || null);
    onUpdated();
    setSaving(null); setSaved('date'); setEditDate(false);
    setTimeout(() => setSaved(null), 2000);
  }

  async function clearDate() {
    const previousDate = dateVal || detail?.acquired_at || '';
    setDateVal('');
    setSaving('date');
    await heldService.updateAcquiredAt(q.id, null);
    setSaving(null);
    onUpdated();
    showToast('info', '取得日を削除しました', {
      label: '元に戻す',
      onClick: async () => {
        if (!previousDate) return;
        await heldService.updateAcquiredAt(q.id, previousDate);
        setDateVal(previousDate);
        onUpdated();
      },
    });
  }

  return (
    <div className="card p-3.5">
      {/* Name + badges */}
      <div className="flex items-start gap-2 mb-3">
        {/* Level color accent */}
        <div
          className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
          style={{ backgroundColor: lv.color, minHeight: '20px' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1 mb-1">
            <span className={cn('badge text-[10px]', MAIN_CATEGORY_COLORS[q.main_category])}>
              {q.main_category}
            </span>
            <span
              className="badge text-[10px]"
              style={{ backgroundColor: `${lv.color}1a`, color: lv.color }}
            >
              {lv.label}
            </span>
          </div>
          <p className="text-[13px] font-bold text-[var(--text-1)] leading-snug">{q.name}</p>
        </div>
      </div>

      {/* Score + date row */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 ml-3">
        {/* Score (only for score-enabled) */}
        {scoreEnabled && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--text-3)] shrink-0">スコア</span>
            {editScore ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={scoreVal}
                  onChange={(e) => setScoreVal(e.target.value)}
                  placeholder={scoreMax ?? scoreUnit}
                  className="w-20 px-2 py-1 rounded-xl border border-indigo-300 dark:border-indigo-600
                             bg-[var(--surface)] text-[13px] text-center
                             focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => e.key === 'Enter' && saveScore()}
                  autoFocus
                />
                <button
                  onClick={saveScore} disabled={saving === 'score'}
                  className="w-7 h-7 flex items-center justify-center rounded-xl
                             bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setEditScore(false); setScoreVal(detail?.score ?? ''); }}
                  className="w-7 h-7 flex items-center justify-center rounded-xl
                             text-[var(--text-3)] hover:bg-[var(--surface-2)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditScore(true)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-xl text-[12px] font-semibold transition-all',
                  saved === 'score'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                    : detail?.score
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100'
                    : 'bg-[var(--surface-2)] text-[var(--text-3)] hover:text-indigo-600 hover:bg-indigo-50'
                )}
              >
                {saved === 'score' ? (
                  <><Check className="w-3 h-3" />保存済</>
                ) : detail?.score ? (
                  <><PenLine className="w-3 h-3" />{detail.score}{scoreUnit}</>
                ) : (
                  <><PenLine className="w-3 h-3" />スコア入力</>
                )}
              </button>
            )}
          </div>
        )}

        {/* Acquisition date */}
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0" />
          <span className="text-[11px] text-[var(--text-3)] shrink-0">取得日</span>
          {editDate ? (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dateVal}
                onChange={(e) => setDateVal(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="px-2 py-1 rounded-xl border border-emerald-300 dark:border-emerald-600
                           bg-[var(--surface)] text-[13px]
                           focus:outline-none focus:ring-2 focus:ring-emerald-500
                           text-[var(--text-1)]"
                autoFocus
              />
              <button
                onClick={saveDate} disabled={saving === 'date'}
                className="w-7 h-7 flex items-center justify-center rounded-xl
                           bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setEditDate(false); setDateVal(detail?.acquired_at ?? ''); }}
                className="w-7 h-7 flex items-center justify-center rounded-xl
                           text-[var(--text-3)] hover:bg-[var(--surface-2)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditDate(true)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-xl text-[12px] font-semibold transition-all',
                  saved === 'date'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                    : displayDate
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-[var(--surface-2)] text-[var(--text-3)] hover:text-emerald-600 hover:bg-emerald-50'
                )}
              >
                {saved === 'date' ? (
                  <><Check className="w-3 h-3" />保存済</>
                ) : displayDate ? (
                  new Date(displayDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
                ) : (
                  <><CalendarDays className="w-3 h-3" />取得日入力</>
                )}
              </button>
              {displayDate && (
                <button
                  onClick={clearDate} disabled={saving === 'date'}
                  className="w-5 h-5 flex items-center justify-center rounded-lg
                             text-[var(--text-4)] hover:text-[var(--text-3)] hover:bg-[var(--surface-2)]
                             disabled:opacity-50 transition-all"
                  title="取得日を削除"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Stat card ───────────────────────────────────────── */

function StatCard({ icon, label, value, gradient }: {
  icon: string; label: string; value: number; gradient: string;
}) {
  return (
    <div className={cn(
      'flex flex-col items-start gap-2 px-4 py-3.5 rounded-2xl shrink-0',
      'bg-gradient-to-br text-white shadow-sm',
      gradient
    )}>
      <span className="text-xl leading-none">{icon}</span>
      <div>
        <p className="text-2xl font-extrabold leading-none tabular-nums">{value}</p>
        <p className="text-[11px] font-semibold opacity-80 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────── */

function EmptyHeld() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100
                      dark:from-emerald-900/30 dark:to-teal-900/30
                      flex items-center justify-center">
        <Trophy className="w-8 h-8 text-emerald-400" />
      </div>
      <div className="space-y-1.5 max-w-xs px-4">
        <h2 className="text-[17px] font-bold text-[var(--text-1)]">保有資格がありません</h2>
        <p className="text-[13px] text-[var(--text-3)] leading-relaxed">
          資格カードの <Star className="inline w-3 h-3" /> をタップして取得済み資格を追加しましょう
        </p>
      </div>
      <Link
        to={ROUTES.HOME}
        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl
                   bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[14px]
                   transition-colors shadow-sm"
      >
        <BookOpen className="w-4 h-4" />
        資格一覧へ
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
