import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown, Check, X, Loader2, GraduationCap, Bell, BookOpen,
  BarChart2, CalendarDays, FileDown, Sparkles, Shield,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { subscriptionService, type PlanCode, type Plan } from '@/services/subscriptionService';
import { useToast } from '@/contexts/ToastContext';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';
import { PremiumBadge } from '@/components/premium/PremiumBadge';

// ─── 機能比較テーブル ─────────────────────────────────────────────

interface FeatureRow {
  label: string;
  free: string | boolean;
  premium: string | boolean;
  icon: React.ReactNode;
  highlight?: boolean;
}

const FEATURES: FeatureRow[] = [
  { icon: <BookOpen className="w-3.5 h-3.5" />, label: '保有資格の登録',     free: '5件まで',    premium: '無制限',         highlight: true  },
  { icon: <BookOpen className="w-3.5 h-3.5" />, label: 'ウィッシュリスト',   free: '10件まで',   premium: '無制限',         highlight: true  },
  { icon: <CalendarDays className="w-3.5 h-3.5" />, label: '受験予定の登録', free: '3件まで',    premium: '無制限',         highlight: true  },
  { icon: <CalendarDays className="w-3.5 h-3.5" />, label: '試験日カレンダー',free: true,        premium: true                              },
  { icon: <Bell className="w-3.5 h-3.5" />,     label: '試験日リマインド',   free: '前日のみ',   premium: '1ヶ月前〜前日',  highlight: true  },
  { icon: <Bell className="w-3.5 h-3.5" />,     label: '申込期限アラート',   free: false,       premium: true,             highlight: true  },
  { icon: <Bell className="w-3.5 h-3.5" />,     label: '合格発表リマインド', free: false,       premium: true                              },
  { icon: <BarChart2 className="w-3.5 h-3.5" />, label: 'スコア履歴グラフ',  free: '5件/資格',  premium: '無制限・グラフ'                  },
  { icon: <Sparkles className="w-3.5 h-3.5" />, label: '学習計画自動作成',   free: false,       premium: true,             highlight: true  },
  { icon: <BarChart2 className="w-3.5 h-3.5" />, label: '学習進捗分析',      free: false,       premium: true                              },
  { icon: <FileDown className="w-3.5 h-3.5" />, label: 'CSVエクスポート',    free: false,       premium: true                              },
  { icon: <CalendarDays className="w-3.5 h-3.5" />, label: 'カレンダー連携', free: false,       premium: true                              },
];

// ─── プラン表示データ ──────────────────────────────────────────────

interface PlanDisplay {
  code: PlanCode;
  label: string;
  badge?: string;
  period: string;
}

const PLAN_DISPLAY: PlanDisplay[] = [
  { code: 'monthly',   label: '月額',   period: '1ヶ月ごと更新'    },
  { code: 'quarterly', label: '3ヶ月',  period: '3ヶ月ごと更新'    },
  { code: 'biannual',  label: '6ヶ月',  period: '6ヶ月ごと更新'    },
  { code: 'annual',    label: '年額',   badge: '最大21%お得', period: '12ヶ月ごと更新' },
];

// ─── ページ本体 ───────────────────────────────────────────────────

export default function PricingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate     = useNavigate();
  const { showToast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>('annual');
  const [loading, setLoading] = useState(false);

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn:  subscriptionService.getStatus,
    enabled:  !!user,
  });

  // プラン一覧取得（DBから）
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['subscription-plans'],
    queryFn:  subscriptionService.getPlans,
  });

  const isResolving = authLoading || (!!user && statusLoading && !statusData);
  const isPremium = statusData?.is_premium ?? false;
  const currentStatus = statusData?.status ?? 'free';

  // 選択中プランのデータ
  const selectedPlanData = plans.find((p) => p.plan_code === selectedPlan);

  // フォールバック価格（DBが空の場合）
  const FALLBACK_PRICES: Record<PlanCode, { price: number; monthly: number; discount: number }> = {
    free:      { price: 0,    monthly: 0,   discount: 0  },
    monthly:   { price: 480,  monthly: 480, discount: 0  },
    quarterly: { price: 1380, monthly: 460, discount: 4  },
    biannual:  { price: 2640, monthly: 440, discount: 8  },
    annual:    { price: 4560, monthly: 380, discount: 21 },
  };

  const price   = selectedPlanData?.price_jpy    ?? FALLBACK_PRICES[selectedPlan].price;
  const monthly = selectedPlanData?.price_monthly ?? FALLBACK_PRICES[selectedPlan].monthly;
  const discount = selectedPlanData?.discount_pct ?? FALLBACK_PRICES[selectedPlan].discount;

  async function handleUpgrade() {
    if (!user) { navigate(ROUTES.LOGIN); return; }
    setLoading(true);
    try {
      const { url } = await subscriptionService.createCheckout(selectedPlan);
      window.location.href = url;
    } catch {
      setLoading(false);
      showToast('error', '決済ページへの遷移に失敗しました。しばらく経ってから再度お試しください。');
    }
  }

  async function handleManage() {
    setLoading(true);
    try {
      const { url } = await subscriptionService.openPortal();
      window.location.href = url;
    } catch {
      setLoading(false);
      showToast('error', '管理ページへの遷移に失敗しました。しばらく経ってから再度お試しください。');
    }
  }

  function renderFreeValue(val: string | boolean) {
    if (val === true)  return <Check className="w-4 h-4 text-emerald-500" />;
    if (val === false) return <X className="w-4 h-4 text-[var(--text-4)]" />;
    return <span className="text-[11px] text-[var(--text-3)]">{val}</span>;
  }
  function renderPremiumValue(val: string | boolean) {
    if (val === true)  return <Check className="w-4 h-4 text-amber-400" />;
    if (val === false) return <X className="w-4 h-4 text-[var(--text-4)]" />;
    return <span className="text-[11px] text-amber-300 font-semibold">{val}</span>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] page-enter">
      {/* ヘッダー */}
      <div className="sticky top-0 z-20 bg-[var(--bg)] border-b border-[var(--border)]">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-[15px] font-extrabold text-[var(--text-1)]">料金プラン</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

        {/* ヒーロー */}
        <div className="text-center space-y-2">
          <PremiumBadge size="md" label="Premium" />
          <h2 className="text-[22px] font-extrabold text-[var(--text-1)] mt-2">
            本気で資格を取るなら、<br />プレミアムへ。
          </h2>
          <p className="text-[13px] text-[var(--text-3)] leading-relaxed">
            学習計画・申込期限アラート・進捗分析で<br />合格までの行動を丸ごとサポートします
          </p>
        </div>

        {/* ローディング中スケルトン */}
        {isResolving && (
          <div className="card p-4 h-[72px] animate-pulse bg-[var(--surface-2)] rounded-2xl" />
        )}

        {/* 現在の契約状態（Premium の場合） */}
        {!isResolving && isPremium && (
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center
                            bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 shrink-0">
              <Crown className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-bold text-[var(--text-1)]">プレミアムご利用中</p>
                <PremiumBadge size="xs" />
              </div>
              {statusData?.expires_at && (
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                  {currentStatus === 'canceled' ? '有効期限' : '次回更新'}：{' '}
                  {new Date(statusData.expires_at).toLocaleDateString('ja-JP')}
                </p>
              )}
            </div>
            <button onClick={handleManage} disabled={loading} className="btn-secondary text-[12px] shrink-0">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'プランを管理'}
            </button>
          </div>
        )}

        {/* プラン切り替えタブ */}
        {!isResolving && !isPremium && (
          <>
            <div className="bg-[var(--surface-2)] rounded-2xl p-1.5 flex gap-1">
              {PLAN_DISPLAY.map((pd) => (
                <button
                  key={pd.code}
                  onClick={() => setSelectedPlan(pd.code)}
                  className={cn(
                    'flex-1 relative py-2 rounded-xl text-[12px] font-semibold transition-all',
                    selectedPlan === pd.code
                      ? 'bg-[var(--bg)] text-[var(--text-1)] shadow-sm'
                      : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
                  )}
                >
                  {pd.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2
                                     px-1.5 py-0.5 rounded-full text-[8px] font-bold
                                     bg-gradient-to-r from-amber-500 to-yellow-400 text-[#120d00]
                                     whitespace-nowrap shadow-sm">
                      {pd.badge}
                    </span>
                  )}
                  {pd.label}
                </button>
              ))}
            </div>

            {/* 価格カード（プレミアム） */}
            <div className={cn(
              'relative rounded-2xl overflow-hidden',
              'bg-gradient-to-b from-[#1a1100] to-[#0d0a00]',
              'border border-amber-500/40',
              'shadow-[0_0_30px_rgba(251,191,36,0.12),0_4px_24px_rgba(0,0,0,0.4)]',
            )}>
              {/* 上部アクセントライン */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <PremiumBadge size="sm" />
                    <p className="text-[11px] text-amber-200/60 mt-1">
                      {PLAN_DISPLAY.find((p) => p.code === selectedPlan)?.period}
                    </p>
                  </div>
                  <div className="text-right">
                    {discount > 0 && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">
                        {discount}% OFF
                      </span>
                    )}
                    <div className="flex items-end gap-1 justify-end mt-1">
                      <span className="text-[28px] font-extrabold text-white leading-none">
                        ¥{price.toLocaleString()}
                      </span>
                      <span className="text-[12px] text-amber-200/50 pb-1">
                        / {selectedPlan === 'monthly' ? '月' : PLAN_DISPLAY.find((p) => p.code === selectedPlan)?.label}
                      </span>
                    </div>
                    {selectedPlan !== 'monthly' && (
                      <p className="text-[11px] text-amber-300/70 text-right">
                        ¥{monthly}/月換算
                      </p>
                    )}
                  </div>
                </div>

                {/* 主要機能ハイライト */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    '登録資格 無制限',
                    '申込期限アラート',
                    '学習計画 自動作成',
                    '進捗グラフ・分析',
                  ].map((feat) => (
                    <div key={feat} className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-[11px] text-amber-100/80">{feat}</span>
                    </div>
                  ))}
                </div>

                {/* CTAボタン */}
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className={cn(
                    'w-full py-3.5 rounded-xl font-bold text-[14px]',
                    'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500',
                    'text-[#120d00]',
                    'hover:opacity-95 active:scale-[0.99] transition-all',
                    'shadow-[0_4px_16px_rgba(251,191,36,0.4)]',
                    'flex items-center justify-center gap-2',
                    'disabled:opacity-50'
                  )}
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Crown className="w-4 h-4" strokeWidth={2} />}
                  {loading ? '処理中...' : 'プレミアムを始める'}
                </button>

                <div className="flex items-center justify-center gap-4">
                  <span className="flex items-center gap-1 text-[10px] text-amber-200/40">
                    <Shield className="w-3 h-3" /> Stripe決済
                  </span>
                  <span className="text-[10px] text-amber-200/40">いつでも解約可</span>
                  <span className="text-[10px] text-amber-200/40">データは保持</span>
                </div>
              </div>

              {/* 下部アクセントライン */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
            </div>
          </>
        )}

        {/* 無料プランカード */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[var(--text-3)]" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[var(--text-1)]">フリープラン</p>
                <p className="text-[11px] text-[var(--text-3)]">基本機能を無料で</p>
              </div>
            </div>
            <p className="text-[20px] font-extrabold text-[var(--text-1)]">
              ¥0<span className="text-[12px] font-normal text-[var(--text-3)]">/月</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {[
              '資格検索・閲覧（128+件）',
              '試験日カレンダー',
              '保有資格5件まで',
              'ウィッシュリスト10件',
              '受験予定3件まで',
              '基本Push通知',
            ].map((f) => (
              <div key={f} className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="text-[11px] text-[var(--text-2)]">{f}</span>
              </div>
            ))}
          </div>

          {!user && (
            <button onClick={() => navigate(ROUTES.REGISTER)} className="btn-secondary w-full text-[13px]">
              無料で始める
            </button>
          )}
          {user && !isPremium && (
            <p className="text-center text-[12px] text-emerald-500 dark:text-emerald-400 font-semibold">
              ✓ 現在のプラン
            </p>
          )}
        </div>

        {/* 機能比較テーブル */}
        <div className="space-y-2">
          <h3 className="text-[13px] font-bold text-[var(--text-1)] px-1">機能詳細</h3>
          <div className="card overflow-hidden">
            {/* ヘッダー行 */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-4 py-2.5
                            bg-[var(--surface-2)] border-b border-[var(--border)]">
              <span className="text-[11px] font-bold text-[var(--text-3)]">機能</span>
              <span className="text-[11px] font-bold text-[var(--text-3)] text-center w-14">無料</span>
              <span className="text-[11px] font-bold text-amber-400 text-center w-16">Premium</span>
            </div>

            {FEATURES.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  'grid grid-cols-[1fr_auto_auto] gap-x-4 px-4 py-2.5 items-center',
                  i < FEATURES.length - 1 && 'border-b border-[var(--border)]',
                  row.highlight && 'bg-amber-500/[0.03]'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--text-3)] shrink-0">{row.icon}</span>
                  <span className={cn('text-[12px]', row.highlight ? 'text-[var(--text-1)] font-medium' : 'text-[var(--text-2)]')}>
                    {row.label}
                  </span>
                </div>
                <div className="flex justify-center w-14">{renderFreeValue(row.free)}</div>
                <div className="flex justify-center w-16">{renderPremiumValue(row.premium)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 安心ポイント */}
        <div className="card p-4 space-y-3">
          <p className="text-[13px] font-bold text-[var(--text-1)]">安心のサブスクリプション</p>
          {[
            { icon: <Shield className="w-3.5 h-3.5 text-indigo-400" />, text: 'Stripeで安全に決済。カード情報はStripeのみ管理します。' },
            { icon: <Check className="w-3.5 h-3.5 text-emerald-500" />,  text: 'いつでも解約OK。解約後も請求期間終了までご利用いただけます。' },
            { icon: <Check className="w-3.5 h-3.5 text-emerald-500" />,  text: '解約後もデータは永久保持。再加入すればすぐに元通りです。' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5">{icon}</span>
              <p className="text-[12px] text-[var(--text-3)] leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] text-[var(--text-4)] pb-4">
          <Bell className="w-3 h-3 inline mr-1" />
          価格は予告なく変更される場合があります
        </p>
      </div>
    </div>
  );
}
