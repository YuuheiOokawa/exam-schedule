import { useNavigate } from 'react-router-dom';
import { Crown, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/constants/routes';
import { PremiumBadge } from './PremiumBadge';

interface PremiumFeatureGateProps {
  feature?: string;
  title?: string;
  description?: string;
  className?: string;
  /** コンパクト表示（カード内インライン用） */
  compact?: boolean;
  /** 上限に達した場合の現在件数・上限値 */
  current?: number;
  max?: number;
}

export function PremiumFeatureGate({
  title = 'プレミアム機能',
  description = 'この機能はプレミアムプランでご利用いただけます。',
  className,
  compact = false,
  current,
  max,
}: PremiumFeatureGateProps) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <div className={cn(
        'flex items-center justify-between px-3.5 py-2.5 rounded-xl',
        'bg-amber-50 dark:bg-amber-900/10',
        'border border-amber-200/70 dark:border-amber-700/30',
        className
      )}>
        <div className="flex items-center gap-2">
          <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={2} />
          <span className="text-[12px] font-semibold text-amber-800 dark:text-amber-300">
            {max !== undefined && current !== undefined
              ? `${current} / ${max}件（上限）`
              : title}
          </span>
        </div>
        <button
          onClick={() => navigate(ROUTES.PRICING)}
          className="text-[11px] font-bold text-amber-600 dark:text-amber-400
                     hover:text-amber-700 dark:hover:text-amber-300
                     flex items-center gap-0.5 transition-colors shrink-0 ml-2"
        >
          アップグレード <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center gap-3 p-6 rounded-2xl text-center',
      'bg-gradient-to-b from-[#120d00]/40 to-[#1e1600]/20',
      'border border-amber-500/20',
      className
    )}>
      {/* アイコン */}
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center
                      bg-gradient-to-br from-amber-500/20 to-amber-600/10
                      border border-amber-500/30">
        <Crown className="w-6 h-6 text-amber-400" strokeWidth={1.5} />
      </div>

      <PremiumBadge size="md" />

      <div className="space-y-1">
        <p className="text-[14px] font-bold text-[var(--text-1)]">{title}</p>
        <p className="text-[12px] text-[var(--text-3)] leading-relaxed max-w-xs">{description}</p>
      </div>

      {max !== undefined && current !== undefined && (
        <div className="text-[11px] text-[var(--text-3)]">
          現在 {current}件 / 上限 {max}件
        </div>
      )}

      <button
        onClick={() => navigate(ROUTES.PRICING)}
        className={cn(
          'flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-[13px]',
          'bg-gradient-to-r from-amber-500 to-yellow-500',
          'text-[#120d00] hover:opacity-90 transition-opacity',
          'shadow-[0_4px_12px_rgba(251,191,36,0.3)]'
        )}
      >
        <Crown className="w-3.5 h-3.5" />
        プレミアムプランを見る
      </button>

      <p className="text-[10px] text-[var(--text-4)]">いつでも解約可・データは保持されます</p>
    </div>
  );
}
