import { cn } from '@/utils/cn';
import { useCategories, useQualifications } from '@/features/qualifications/hooks/useQualifications';

interface Props {
  selectedMain: string;
  selectedSub: string;
  onMainChange: (v: string) => void;
  onSubChange: (v: string) => void;
}

const MAIN_META: Record<string, { icon: string; activeClass: string }> = {
  国家資格: { icon: '🏛️', activeClass: 'chip-active-blue'   },
  民間資格: { icon: '🏢', activeClass: 'chip-active-violet' },
  公的資格: { icon: '📋', activeClass: 'chip-active-emerald' },
};

export function CategoryFilter({ selectedMain, selectedSub, onMainChange, onSubChange }: Props) {
  const { data: categoryData } = useCategories();
  const { data: allData }      = useQualifications({});

  const mainCategories = categoryData?.mainCategories ?? ['国家資格', '民間資格', '公的資格'];

  const subCategoriesMap: Record<string, string[]> = categoryData
    ? categoryData.subCategories.reduce<Record<string, string[]>>((acc, { main_category, sub_category }) => {
        if (!acc[main_category]) acc[main_category] = [];
        acc[main_category].push(sub_category);
        return acc;
      }, {})
    : {};

  const countByMain: Record<string, number> = {};
  const countBySub:  Record<string, number> = {};
  if (allData) {
    for (const q of allData) {
      countByMain[q.main_category] = (countByMain[q.main_category] ?? 0) + 1;
      const key = `${q.main_category}__${q.sub_category}`;
      countBySub[key] = (countBySub[key] ?? 0) + 1;
    }
  }

  const subCategories = selectedMain ? (subCategoriesMap[selectedMain] ?? []) : [];

  return (
    <div className="space-y-2">
      {/* ── Main category chips ── */}
      <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto md:overflow-x-visible scrollbar-hide pb-0.5 md:pb-0 w-full min-w-0">
        {/* All */}
        <button
          onClick={() => { onMainChange(''); onSubChange(''); }}
          className={cn('chip', !selectedMain ? 'chip-active' : '')}
        >
          <span className="text-sm leading-none">🗂️</span>
          <span>すべて</span>
          {allData && (
            <span className={cn(
              'text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[18px] text-center',
              !selectedMain
                ? 'bg-white/25 text-white'
                : 'bg-[var(--surface-3)] text-[var(--text-3)]'
            )}>
              {allData.length}
            </span>
          )}
        </button>

        {mainCategories.map((cat) => {
          const meta   = MAIN_META[cat];
          const active = selectedMain === cat;
          const count  = countByMain[cat] ?? 0;
          return (
            <button
              key={cat}
              onClick={() => { onMainChange(cat); onSubChange(''); }}
              className={cn('chip', active ? meta?.activeClass : '')}
            >
              <span className="text-sm leading-none">{meta?.icon ?? '📁'}</span>
              <span>{cat}</span>
              {count > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[18px] text-center',
                  active
                    ? 'bg-white/25 text-white'
                    : 'bg-[var(--surface-3)] text-[var(--text-3)]'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Sub-category chips ── */}
      {subCategories.length > 0 && (
        <div className="flex flex-nowrap md:flex-wrap gap-1.5 overflow-x-auto md:overflow-x-visible scrollbar-hide pb-0.5 md:pb-0 w-full min-w-0">
          <button
            onClick={() => onSubChange('')}
            className={cn('sub-chip', !selectedSub ? 'sub-chip-active' : '')}
          >
            すべて
          </button>
          {subCategories.map((sub) => {
            const count = countBySub[`${selectedMain}__${sub}`] ?? 0;
            return (
              <button
                key={sub}
                onClick={() => onSubChange(sub)}
                className={cn('sub-chip', selectedSub === sub ? 'sub-chip-active' : '')}
              >
                {sub}
                {count > 0 && (
                  <span className={cn(
                    'ml-0.5 text-[9px] font-bold',
                    selectedSub === sub ? 'opacity-75' : 'opacity-50'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
