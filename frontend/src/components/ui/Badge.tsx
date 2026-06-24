import { cn } from '@/utils/cn';
import { MAIN_CATEGORY_COLORS } from '@/constants/categories';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'category';
  category?: string;
  className?: string;
}

export function Badge({ children, variant = 'default', category, className }: BadgeProps) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';

  const colorClass =
    variant === 'category' && category
      ? (MAIN_CATEGORY_COLORS[category] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300')
      : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';

  return <span className={cn(base, colorClass, className)}>{children}</span>;
}
