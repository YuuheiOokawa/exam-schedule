import { SearchX } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = 'データがありません',
  description,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 dark:text-slate-500">
      {icon ?? <SearchX className="w-10 h-10" />}
      <p className="text-base font-medium text-slate-500 dark:text-slate-400">{title}</p>
      {description && <p className="text-sm text-center max-w-xs">{description}</p>}
    </div>
  );
}
