import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'データの取得に失敗しました', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400 dark:text-slate-500">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          再試行
        </Button>
      )}
    </div>
  );
}
