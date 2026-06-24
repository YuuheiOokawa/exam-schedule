import { Link } from 'react-router-dom';
import { Star, ChevronRight, BookOpen, Trophy } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useHeldQualifications } from '@/contexts/HeldQualificationsContext';
import { useToast } from '@/contexts/ToastContext';
import { useQualifications } from '@/features/qualifications/hooks/useQualifications';
import { useEntitlements } from '@/hooks/useEntitlements';
import { PremiumFeatureGate } from '@/components/premium/PremiumFeatureGate';
import { getLevelConfig } from '@/utils/level';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

export default function WishlistPage() {
  const { wishlistIds, count, toggle } = useWishlist();
  const { heldIds, toggleHeld } = useHeldQualifications();
  const { data: allQuals = [] } = useQualifications({});
  const { isAtLimit, usageLabel, isPremium, entitlements } = useEntitlements();
  const { showToast } = useToast();

  function removeWithUndo(qualId: number, qualName: string) {
    toggle(qualId);
    showToast('info', `「${qualName}」を削除しました`, {
      label: '元に戻す',
      onClick: () => toggle(qualId),
    });
  }

  const items = allQuals.filter((q) => wishlistIds.has(q.id));

  return (
    <div className="min-h-screen bg-[var(--bg)] page-enter">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[var(--bg)]/90 backdrop-blur-md
                      border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600
                          flex items-center justify-center shrink-0">
            <Star className="w-3.5 h-3.5 text-white" strokeWidth={2.5} fill="white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-extrabold text-[var(--text-1)]">挑戦リスト</h1>
          </div>
          <span className="text-[12px] text-[var(--text-3)] font-semibold tabular-nums">{count}件</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-2.5">
        {/* 上限到達バナー */}
        {isAtLimit('max_wishlist') && !isPremium && items.length > 0 && (
          <PremiumFeatureGate
            compact
            title="挑戦リストの上限に達しました"
            current={entitlements.usage.wishlist}
            max={entitlements.max_wishlist ?? undefined}
          />
        )}
        {/* 上限に近い警告（残り1件） */}
        {!isAtLimit('max_wishlist') && !isPremium &&
          entitlements.max_wishlist !== null &&
          entitlements.usage.wishlist >= (entitlements.max_wishlist ?? 0) - 1 &&
          entitlements.usage.wishlist > 0 && (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl
                          bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30">
            <p className="text-[12px] text-amber-700 dark:text-amber-400">
              挑戦リスト {usageLabel('max_wishlist')} — あと1件で上限です
            </p>
            <Link to={ROUTES.PRICING} className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline">
              プランを見る
            </Link>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-pink-100 dark:bg-pink-900/20
                            flex items-center justify-center mb-4">
              <Star className="w-8 h-8 text-pink-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-[16px] font-bold text-[var(--text-1)] mb-2">挑戦リストは空です</h2>
            <p className="text-[13px] text-[var(--text-3)] leading-relaxed mb-6">
              資格の詳細ページから<br />「挑戦リストに追加」ができます
            </p>
            <Link to={ROUTES.LIST} className="btn-primary text-sm px-5 py-2.5">
              <BookOpen className="w-4 h-4" />
              資格一覧を見る
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-[var(--text-3)] pb-1">
              ★ タップして詳細へ・トグルボタンで保有済みに移動できます
            </p>
            {items.map((q) => {
              const config = getLevelConfig(q.name, q.main_category);
              const isHeld = heldIds.has(q.id);

              return (
                <div key={q.id} className="card overflow-hidden">
                  <div className="flex items-center gap-3 p-3.5">
                    {/* Level stripe */}
                    <div
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: config.color }}
                    />

                    <Link
                      to={ROUTES.QUALIFICATION_DETAIL(q.id)}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-[13px] font-bold text-[var(--text-1)] truncate">{q.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: config.color + '22', color: config.color }}>
                          {config.label}
                        </span>
                        <span className="text-[11px] text-[var(--text-3)]">{q.sub_category}</span>
                        {q.exam_date && (
                          <span className="text-[11px] text-[var(--text-3)]">
                            · {new Date(q.exam_date).getMonth() + 1}月{new Date(q.exam_date).getDate()}日
                          </span>
                        )}
                      </div>
                    </Link>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Move to held */}
                      <button
                        onClick={() => toggleHeld(q.id)}
                        className={cn(
                          'w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90',
                          isHeld
                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                            : 'bg-[var(--surface-2)] text-[var(--text-3)]'
                        )}
                        title={isHeld ? '保有済みから外す' : '保有済みにする'}
                      >
                        <Trophy className="w-3.5 h-3.5" strokeWidth={isHeld ? 2.5 : 2} />
                      </button>

                      {/* Remove from wishlist */}
                      <button
                        onClick={() => removeWithUndo(q.id, q.name)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center
                                   bg-pink-500 text-white shadow-sm shadow-pink-500/30
                                   active:scale-90 transition-all"
                        title="挑戦リストから削除"
                      >
                        <Star className="w-3.5 h-3.5" strokeWidth={2.5} fill="white" />
                      </button>

                      <Link to={ROUTES.QUALIFICATION_DETAIL(q.id)}>
                        <ChevronRight className="w-4 h-4 text-[var(--text-4)]" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
