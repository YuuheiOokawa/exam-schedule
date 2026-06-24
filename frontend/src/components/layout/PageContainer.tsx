import { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageContainer({ children, className, title, description, actions }: PageContainerProps) {
  return (
    <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 py-8', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            {title && (
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
            )}
            {description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
