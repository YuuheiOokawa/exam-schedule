import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, SlidersHorizontal, GraduationCap, ArrowUpDown, ChevronRight, CalendarDays, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { QualificationCard } from '@/features/qualifications/components/QualificationCard';
import { CategoryFilter } from '@/features/qualifications/components/CategoryFilter';
import { useQualifications } from '@/features/qualifications/hooks/useQualifications';
import { getQualificationLevel, getLevelConfig } from '@/utils/level';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/constants/routes';
import type { QualificationWithSchedule } from '@/types/qualification';
import { MAIN_CATEGORY_COLORS } from '@/constants/categories';

const LEVEL_DOTS = [
  { label: '入門',    color: '#10b981' },
  { label: '基礎',    color: '#3b82f6' },
  { label: '中級',    color: '#f59e0b' },
  { label: '上級',    color: '#ef4444' },
  { label: 'Expert', color: '#8b5cf6' },
] as const;

const LEVEL_ORDER = { entry: 0, basic: 1, intermediate: 2, advanced: 3, expert: 4 } as const;

type SortKey = 'default' | 'exam_date' | 'level_asc' | 'level_desc' | 'name';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default',    label: 'デフォルト' },
  { value: 'exam_date',  label: '試験日が近い順' },
  { value: 'level_asc',  label: '難易度：易しい順' },
  { value: 'level_desc', label: '難易度：難しい順' },
  { value: 'name',       label: '名前順' },
];

// ── Grouping ────────────────────────────────────────────────────────

type QualGroup = { key: string; items: QualificationWithSchedule[] };

function getGroupKey(name: string): string {
  let k = name;
  // 1. 末尾の括弧注記を先に除去: "(FP1級)" "(中国語検定)" "(Linux管理者)" "(1Z0-815)" etc.
  k = k.replace(/\s*\([^)]+\)\s*$/, '');
  // 2. 末尾: 日本語等級 (1級, 準1級, 第1種, 第2種 etc.)
  k = k.replace(/\s*(第|準)?[0-9]+\s*[級段位種]$/, '');
  // 3. 末尾: ローマ数字種別 (Ⅰ種, Ⅱ種, Ⅲ種)
  k = k.replace(/\s+[ⅠⅡⅢⅣⅤ]+種$/, '');
  // 4. 末尾: JLPT (N1-N5)
  k = k.replace(/\s+N[1-5]$/i, '');
  // 5. 末尾: Level N (HTML5試験など)
  k = k.replace(/\s+Level\s*[0-9]+$/i, '');
  // 6. 末尾: 点数 (600点, 730点以上)
  k = k.replace(/\s*[0-9]+点[以上超]?$/, '');
  // 7. 末尾: 日本語レベル語 (複合形を先に)
  k = k.replace(/\s*(アドバンスクラス|スタンダードクラス|初級|中級|上級|入門|基礎|応用|実践|ベーシック|アドバンス|エキスパート|スタンダード)$/, '');
  // 8. 中置き or 末尾: 英語ランク語 (Oracle Master Bronze/Silver/Gold/Platinum, Ruby Silver/Gold)
  k = k.replace(/\s+(Bronze|Silver|Gold|Platinum)\s*/gi, ' ');
  // 9. 末尾: クラウド資格レベル "- Associate" "- Professional" "- Specialty" (AWS etc.)
  k = k.replace(/\s*-\s*(Associate|Professional|Specialty|Foundation|Expert)$/i, '');
  // 10. 先頭: "1級XXX" → "XXX" (1級建築施工管理技士 etc.)
  k = k.replace(/^[0-9]+[級種]\s*/, '');
  // 11. 番号付きダッシュ: "LPIC-1" → "LPIC"
  k = k.replace(/-[0-9]+(?=\s|$)/, '');
  return k.trim();
}

/** グループキーに対して「レベル名」を返す。チップ表示・シート一覧で使用。 */
function extractLevelLabel(fullName: string, groupKey: string): string {
  // 末尾括弧を除去した名前を使う
  const stripped = fullName.replace(/\s*\([^)]+\)\s*$/, '').trim();

  // Case 1: groupKey がプレフィックスのとき → 残りがレベル名
  if (stripped.startsWith(groupKey)) {
    const suffix = stripped.slice(groupKey.length).trim();
    if (suffix.length > 0) {
      if (suffix.startsWith('- ')) return suffix.slice(2); // "- Associate" → "Associate"
      if (!suffix.startsWith('-')) return suffix;          // "1級" / "Bronze" そのまま
      // "-1" のようなケースは語差分へフォールスルー
    }
  }

  // Case 2: キーにない語を抽出 (Oracle Master Bronze / LPIC-1 etc.)
  const keyWords = new Set(groupKey.toLowerCase().split(/\s+/));
  const extra = stripped.split(/\s+/).filter(w => !keyWords.has(w.toLowerCase()));
  if (extra.length >= 1 && extra.length <= 3) return extra.join(' ');

  return stripped;
}

function groupQualifications(quals: QualificationWithSchedule[]): QualGroup[] {
  const grouped = new Map<string, QualificationWithSchedule[]>();
  for (const q of quals) {
    const key = getGroupKey(q.name);
    if (key !== q.name && key.length > 0) {
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(q);
    }
  }

  const trueGroupKeys = new Set<string>();
  for (const [key, items] of grouped.entries()) {
    if (items.length >= 2) trueGroupKeys.add(key);
  }

  const seenGroups = new Set<string>();
  const result: QualGroup[] = [];

  for (const q of quals) {
    const key = getGroupKey(q.name);
    const isGroupable = key !== q.name && key.length > 0 && trueGroupKeys.has(key);

    if (isGroupable) {
      if (!seenGroups.has(key)) {
        seenGroups.add(key);
        const allItems = grouped.get(key)!;
        const sortedItems = [...allItems].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        result.push({ key, items: sortedItems });
      }
    } else {
      result.push({ key: q.name, items: [q] });
    }
  }

  return result;
}

// ── Date utils ──────────────────────────────────────────────────────

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
}

function getDaysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

// ── GroupCard ───────────────────────────────────────────────────────

function GroupCard({ group, onOpen }: { group: QualGroup; onOpen: () => void }) {
  const rep = group.items[0];
  const lv  = getLevelConfig(rep.name, rep.main_category);

  const nearestDate = group.items
    .map(i => i.exam_date)
    .filter((d): d is string => !!d)
    .sort()[0];

  const daysToNearest = nearestDate ? getDaysUntil(nearestDate) : null;
  const urgent = daysToNearest !== null && daysToNearest >= 0 && daysToNearest <= 14;

  const suffixes = group.items.map(q => extractLevelLabel(q.name, group.key));

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('qual-card text-left w-full', lv.cardClass)}
    >
      {/* Glass top shimmer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none z-10" />
      <div
        className="absolute inset-x-0 top-0 h-20 pointer-events-none"
        style={{ background: `linear-gradient(180deg, ${lv.color}14 0%, transparent 100%)` }}
      />

      <div className="p-3 flex flex-col gap-2 relative">
        {/* Row 1: category + level count */}
        <div className="flex items-start justify-between gap-1.5">
          <span className={cn('badge text-[10px]', MAIN_CATEGORY_COLORS[rep.main_category])}>
            {rep.main_category}
          </span>
          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                           bg-indigo-100 dark:bg-indigo-900/40
                           text-indigo-600 dark:text-indigo-300
                           border border-indigo-200 dark:border-indigo-700/40">
            {group.items.length}段階
          </span>
        </div>

        {/* Row 2: Base name */}
        <h3 className="text-[13px] sm:text-[14px] font-bold leading-snug tracking-[-0.01em]
                       text-[var(--text-1)] line-clamp-2 min-h-[2.6em]">
          {group.key}
        </h3>

        {/* Row 3: Level suffix chips */}
        <div className="flex flex-wrap gap-1">
          {suffixes.slice(0, 5).map((s, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold
                         bg-[var(--surface-2)] dark:bg-[var(--surface-3)]
                         text-[var(--text-2)] border border-[var(--border)]"
            >
              {s}
            </span>
          ))}
          {suffixes.length > 5 && (
            <span className="text-[10px] text-[var(--text-3)] self-center">
              +{suffixes.length - 5}
            </span>
          )}
        </div>

        {/* Row 4: Nearest date + tap indicator */}
        <div className="flex items-center justify-between gap-2">
          {nearestDate ? (
            <div className={cn(
              'flex items-center gap-1 text-[11px]',
              urgent ? 'text-red-500 dark:text-red-400' : 'text-[var(--text-2)]'
            )}>
              <CalendarDays className="w-3 h-3 shrink-0" />
              <span className="font-semibold tabular-nums">{formatDateShort(nearestDate)}</span>
              {daysToNearest !== null && daysToNearest >= 0 && daysToNearest <= 30 && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white',
                  daysToNearest <= 14 ? 'bg-red-500' : 'bg-orange-400'
                )}>
                  あと{daysToNearest}日
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-[var(--text-3)]">日程は公式で確認</span>
          )}
          <div className="flex items-center gap-0.5 text-indigo-500 dark:text-indigo-400 shrink-0">
            <span className="text-[10px] font-semibold">選択</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </button>
  );
}

// ── LevelSheet (bottom sheet) ────────────────────────────────────────

function LevelSheet({ group, onClose }: { group: QualGroup | null; onClose: () => void }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!group) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [group]);

  if (!group) return null;

  // createPortal で document.body 直下に描画 → page-enter の transform 影響を受けない
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up
                      bg-[var(--bg)] border-t border-[var(--border)]
                      rounded-t-3xl shadow-2xl shadow-black/20
                      max-h-[78vh] flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 pt-1 shrink-0 border-b border-[var(--border)]
                        flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-extrabold text-[var(--text-1)] tracking-tight">
              {group.key}
            </h2>
            <p className="text-[12px] text-[var(--text-3)] mt-0.5">
              レベルを選んでください（{group.items.length}種類）
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full mt-0.5 shrink-0
                       bg-[var(--surface-2)] text-[var(--text-3)]
                       hover:bg-[var(--surface-3)] hover:text-[var(--text-1)]
                       transition-all active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Level list — scrollable */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2.5">
          {group.items.map((q) => {
            const lv = getLevelConfig(q.name, q.main_category);
            const suffix = extractLevelLabel(q.name, group.key);
            const daysTo = q.exam_date ? getDaysUntil(q.exam_date) : null;

            return (
              <button
                key={q.id}
                onClick={() => { onClose(); navigate(ROUTES.QUALIFICATION_DETAIL(q.id)); }}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border text-left
                           bg-[var(--surface)] border-[var(--border)]
                           hover:bg-[var(--surface-2)] active:scale-[0.985]
                           transition-all duration-150"
              >
                {/* Level color bar */}
                <div
                  className="w-1 self-stretch rounded-full min-h-[2.5rem] shrink-0"
                  style={{ backgroundColor: lv.color }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[var(--text-1)]">
                    {suffix}
                  </p>
                  {suffix !== q.name && (
                    <p className="text-[11px] text-[var(--text-3)] truncate mt-0.5">{q.name}</p>
                  )}
                  {q.exam_date ? (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <div className="flex items-center gap-1 text-[11px] text-[var(--text-2)]">
                        <CalendarDays className="w-3 h-3 shrink-0" />
                        <span className="tabular-nums">{formatDateShort(q.exam_date)}</span>
                      </div>
                      {daysTo !== null && daysTo >= 0 && daysTo <= 30 && (
                        <span className={cn(
                          'px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white',
                          daysTo <= 14 ? 'bg-red-500' : 'bg-orange-400'
                        )}>
                          あと{daysTo}日
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-[var(--text-3)]">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>
                        {q.exam_format === 'anytime' ? 'いつでも受験可' :
                         q.exam_format === 'cbt'     ? 'CBT随時'       :
                         '日程は公式で確認'}
                      </span>
                    </div>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-[var(--text-3)] shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Bottom safe area for iOS home indicator */}
        <div className="pb-6 shrink-0" />
      </div>
    </>,
    document.body
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function QualificationsPage() {
  const [search,        setSearch]        = useState('');
  const [mainCategory,  setMainCategory]  = useState('');
  const [subCategory,   setSubCategory]   = useState('');
  const [showFilters,   setShowFilters]   = useState(false);
  const [showSort,      setShowSort]      = useState(false);
  const [sortKey,       setSortKey]       = useState<SortKey>('default');
  const [selectedGroup, setSelectedGroup] = useState<QualGroup | null>(null);

  const debouncedSearch = useDebounce(search, 280);

  const { data: rawData, isLoading, isError, refetch } = useQualifications({
    search:        debouncedSearch || undefined,
    main_category: mainCategory    || undefined,
    sub_category:  subCategory     || undefined,
  });
  const { data: allData } = useQualifications({});

  // Sort individual items first, then group
  const groups = useMemo(() => {
    if (!rawData) return null;

    let sorted = rawData;
    if (sortKey !== 'default') {
      sorted = [...rawData].sort((a, b) => {
        if (sortKey === 'name') return a.name.localeCompare(b.name, 'ja');

        if (sortKey === 'exam_date') {
          if (!a.exam_date && !b.exam_date) return 0;
          if (!a.exam_date) return 1;
          if (!b.exam_date) return -1;
          return new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime();
        }

        if (sortKey === 'level_asc' || sortKey === 'level_desc') {
          const la = LEVEL_ORDER[getQualificationLevel(a.name, a.main_category)];
          const lb = LEVEL_ORDER[getQualificationLevel(b.name, b.main_category)];
          return sortKey === 'level_asc' ? la - lb : lb - la;
        }

        return 0;
      });
    }

    return groupQualifications(sorted);
  }, [rawData, sortKey]);

  const total      = allData?.length ?? 0;
  const groupCount = groups?.length ?? 0;
  const isFiltered = !!(mainCategory || subCategory || debouncedSearch);
  const sortLabel  = SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? 'デフォルト';

  return (
    <div className="min-h-screen w-full page-enter">
      {/* ══ Sticky header ══════════════════════════════════════ */}
      <div className="sticky top-0 z-20 bg-[var(--bg)]/90 backdrop-blur-lg border-b border-[var(--border)]
                      shadow-sm shadow-black/[0.03]">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3 space-y-3">

          {/* Page title row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h1 className="text-[15px] font-extrabold text-[var(--text-1)] tracking-tight leading-none">
                  資格一覧
                </h1>
                <p className="text-[11px] text-[var(--text-2)] mt-0.5">{total} 件</p>
              </div>
            </div>

            <div className="hidden xs:flex sm:flex items-center gap-2 shrink-0">
              {LEVEL_DOTS.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-[var(--text-2)] hidden sm:inline">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Search + sort + filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-2)] pointer-events-none" />
              <input
                type="search"
                placeholder="資格名で検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  'w-full pl-10 pr-9 py-2.5 rounded-2xl border text-[14px]',
                  'bg-[var(--surface)] text-[var(--text-1)] border-[var(--border)]',
                  'placeholder-[var(--text-4)]',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                  'transition-all'
                )}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]
                             hover:text-[var(--text-1)] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort button */}
            <button
              onClick={() => { setShowSort((v) => !v); setShowFilters(false); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border text-[12px] font-semibold',
                'transition-all duration-150 shrink-0',
                showSort || sortKey !== 'default'
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-2)]'
              )}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{sortKey !== 'default' ? sortLabel : '並び替え'}</span>
            </button>

            {/* Filter button */}
            <button
              onClick={() => { setShowFilters((v) => !v); setShowSort(false); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border text-[12px] font-semibold',
                'transition-all duration-150 shrink-0',
                showFilters
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-2)]'
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">フィルター</span>
              {isFiltered && !showFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </button>
          </div>

        </div>
      </div>

      {/* ══ Filter/Sort panels ══════════════════════════════════ */}
      {(showSort || showFilters) && (
        <div className="bg-[var(--bg)] border-b border-[var(--border)] w-full">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 py-2.5 animate-fade-up min-w-0">
            {showSort && (
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortKey(opt.value); setShowSort(false); }}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all',
                      sortKey === opt.value
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-2)]'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {showFilters && (
              <CategoryFilter
                selectedMain={mainCategory}
                selectedSub={subCategory}
                onMainChange={(v) => { setMainCategory(v); setSubCategory(''); }}
                onSubChange={setSubCategory}
              />
            )}
          </div>
        </div>
      )}

      {/* ══ Content ════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4">

        {!isLoading && !isError && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] text-[var(--text-3)]">
              {isFiltered ? (
                <>
                  <strong className="text-[var(--text-1)]">{groupCount}</strong>
                  <span className="mx-1">件</span>
                  <span className="text-[11px]">（全{total}件中）</span>
                </>
              ) : (
                <><strong className="text-[var(--text-1)]">{groupCount}</strong> 件</>
              )}
            </p>
            {(isFiltered || sortKey !== 'default') && (
              <button
                onClick={() => { setMainCategory(''); setSubCategory(''); setSearch(''); setSortKey('default'); }}
                className="flex items-center gap-1 text-[12px] text-indigo-600 dark:text-indigo-400
                           hover:underline font-medium"
              >
                <X className="w-3 h-3" />
                リセット
              </button>
            )}
          </div>
        )}

        {isLoading && <LoadingState cards cardCount={8} />}
        {isError   && <ErrorState onRetry={refetch} />}

        {!isLoading && !isError && groups?.length === 0 && (
          <EmptyState
            title="資格が見つかりません"
            description="検索条件を変えてお試しください"
            icon={<GraduationCap className="w-10 h-10" />}
          />
        )}

        {!isLoading && !isError && groups && groups.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {groups.map((group, i) => (
              <div
                key={group.key}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 15, 180)}ms` }}
              >
                {group.items.length === 1 ? (
                  <QualificationCard qualification={group.items[0]} />
                ) : (
                  <GroupCard
                    group={group}
                    onOpen={() => setSelectedGroup(group)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* ══ Level Bottom Sheet ════════════════════════════════ */}
      <LevelSheet
        group={selectedGroup}
        onClose={() => setSelectedGroup(null)}
      />
    </div>
  );
}
