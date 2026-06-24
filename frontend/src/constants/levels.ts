export type DifficultyLevel = 'entry' | 'basic' | 'intermediate' | 'advanced' | 'expert';

export const LEVEL_CONFIG: Record<DifficultyLevel, {
  label: string;
  stars: number;
  cardClass: string;
  badgeClass: string;
  dotClass: string;
  textClass: string;
  ringClass: string;
  color: string;
}> = {
  entry: {
    label: '入門',
    stars: 1,
    cardClass: 'qual-card-entry',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    dotClass: 'bg-emerald-400',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    ringClass: 'ring-emerald-400/40',
    color: '#34d399',
  },
  basic: {
    label: '基礎',
    stars: 2,
    cardClass: 'qual-card-basic',
    badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    dotClass: 'bg-sky-400',
    textClass: 'text-sky-600 dark:text-sky-400',
    ringClass: 'ring-sky-400/40',
    color: '#38bdf8',
  },
  intermediate: {
    label: '中級',
    stars: 3,
    cardClass: 'qual-card-intermediate',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    dotClass: 'bg-amber-400',
    textClass: 'text-amber-600 dark:text-amber-400',
    ringClass: 'ring-amber-400/40',
    color: '#fbbf24',
  },
  advanced: {
    label: '上級',
    stars: 4,
    cardClass: 'qual-card-advanced',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    dotClass: 'bg-rose-400',
    textClass: 'text-rose-600 dark:text-rose-400',
    ringClass: 'ring-rose-400/40',
    color: '#fb7185',
  },
  expert: {
    label: 'エキスパート',
    stars: 5,
    cardClass: 'qual-card-expert',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-600 dark:text-purple-400',
    ringClass: 'ring-purple-500/40',
    color: '#a855f7',
  },
};
