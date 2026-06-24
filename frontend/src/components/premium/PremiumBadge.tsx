import { Crown } from 'lucide-react';
import { cn } from '@/utils/cn';

type Size = 'xs' | 'sm' | 'md' | 'lg';

interface PremiumBadgeProps {
  size?: Size;
  className?: string;
  label?: string;
}

const sizeMap: Record<Size, { wrap: string; icon: string; text: string }> = {
  xs: { wrap: 'px-1.5 py-0.5 gap-0.5',  icon: 'w-2.5 h-2.5', text: 'text-[9px]'  },
  sm: { wrap: 'px-2   py-0.5 gap-1',     icon: 'w-3   h-3',   text: 'text-[10px]' },
  md: { wrap: 'px-2.5 py-1   gap-1',     icon: 'w-3.5 h-3.5', text: 'text-[11px]' },
  lg: { wrap: 'px-3   py-1   gap-1.5',   icon: 'w-4   h-4',   text: 'text-[13px]' },
};

export function PremiumBadge({ size = 'sm', className, label = 'Premium' }: PremiumBadgeProps) {
  const s = sizeMap[size];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold select-none',
        // 漆黒 → 深みのある黒 → 漆黒 のグラデーション背景
        'bg-gradient-to-r from-[#120d00] via-[#1e1600] to-[#120d00]',
        // ゴールドの境界線
        'border border-amber-500/60',
        // 外側グロー + 内側ハイライト
        'shadow-[0_0_12px_rgba(251,191,36,0.25),inset_0_1px_0_rgba(251,191,36,0.15)]',
        s.wrap,
        className
      )}
    >
      <Crown className={cn('text-amber-400 shrink-0', s.icon)} strokeWidth={2} />
      {/* ゴールドグラデーションテキスト */}
      <span
        className={cn('bg-clip-text text-transparent font-bold tracking-wide', s.text)}
        style={{
          backgroundImage: 'linear-gradient(90deg, #fbbf24 0%, #fef08a 40%, #f59e0b 70%, #fbbf24 100%)',
        }}
      >
        {label}
      </span>
    </span>
  );
}

// プレミアム限定機能に付けるインラインバッジ（テキスト横用）
export function PremiumInline() {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-bold text-[9px] ml-1',
        'bg-gradient-to-r from-[#120d00] via-[#1e1600] to-[#120d00]',
        'border border-amber-500/50',
        'shadow-[0_0_6px_rgba(251,191,36,0.15)]',
      )}
    >
      <Crown className="w-2.5 h-2.5 text-amber-400" strokeWidth={2} />
      <span
        className="bg-clip-text text-transparent tracking-wide"
        style={{ backgroundImage: 'linear-gradient(90deg, #fbbf24, #fef08a, #fbbf24)' }}
      >
        Pro
      </span>
    </span>
  );
}
