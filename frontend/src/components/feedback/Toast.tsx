import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/utils/cn';
import type { ToastType } from '@/contexts/ToastContext';

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
};

const STYLES: Record<ToastType, string> = {
  success: 'border-emerald-200 dark:border-emerald-800',
  error: 'border-red-200 dark:border-red-800',
  info: 'border-blue-200 dark:border-blue-800',
  warning: 'border-amber-200 dark:border-amber-800',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 px-4 py-3.5 rounded-2xl border shadow-xl pointer-events-auto',
            'bg-white/95 dark:bg-slate-800/95 backdrop-blur-md',
            'animate-slide-in-right',
            STYLES[toast.type]
          )}
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)' }}
        >
          <div className="shrink-0 mt-0.5">{ICONS[toast.type]}</div>
          <p className="flex-1 text-[13px] font-medium text-slate-700 dark:text-slate-200 leading-snug">
            {toast.message}
          </p>
          {toast.action && (
            <button
              onClick={() => { toast.action!.onClick(); removeToast(toast.id); }}
              className="shrink-0 text-[12px] font-bold text-indigo-600 dark:text-indigo-400
                         hover:underline whitespace-nowrap self-center"
            >
              {toast.action.label}
            </button>
          )}
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-300 hover:text-slate-500 dark:hover:text-slate-300
                       transition-colors shrink-0 self-center"
            aria-label="閉じる"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
