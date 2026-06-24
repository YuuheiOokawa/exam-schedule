import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LogOut, LogIn, UserPlus, Settings, Trophy, Sun, Moon,
  ChevronRight, GraduationCap, Shield, Star, Map, Calendar,
  PenLine, Check, X, CheckCircle2, XCircle, CalendarDays, Trash2, AlertTriangle,
  Crown, Bell, BellOff, Loader2, AlertCircle, ExternalLink, Download, Receipt,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHeldQualifications } from '@/contexts/HeldQualificationsContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useToast } from '@/contexts/ToastContext';
import { planService } from '@/services/planService';
import { subscriptionService } from '@/services/subscriptionService';
import { usePushNotification } from '@/hooks/usePushNotification';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { apiClient } from '@/services/api';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

export default function ProfilePage() {
  const { user, isAdmin, updateUser, logout } = useAuth();
  const { theme, toggleTheme }               = useTheme();
  const { count }                            = useHeldQualifications();
  const { count: wishlistCount }             = useWishlist();
  const { showToast }                        = useToast();
  const navigate                             = useNavigate();
  const queryClient                          = useQueryClient();
  const [searchParams, setSearchParams]      = useSearchParams();

  const [editingName,   setEditingName]   = useState(false);
  const [nameInput,     setNameInput]     = useState('');
  const [nameSaving,    setNameSaving]    = useState(false);
  const [nameError,     setNameError]     = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutBanner, setCheckoutBanner] = useState<'success' | 'cancel' | null>(null);
  const [csvExporting,  setCsvExporting]  = useState<string | null>(null);

  // checkout=success / checkout=cancel パラメータを処理
  useEffect(() => {
    const result = searchParams.get('checkout');
    if (result === 'success' || result === 'cancel') {
      setCheckoutBanner(result);
      setSearchParams({}, { replace: true });
      if (result === 'success') {
        // サブスク状態を再取得
        queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
        queryClient.invalidateQueries({ queryKey: ['entitlements'] });
      }
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const { data: rawPlans = [] } = useQuery({
    queryKey: ['exam-plans-all'],
    queryFn:  planService.getAll,
    enabled:  !!user,
  });

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn:  subscriptionService.getStatus,
    enabled:  !!user,
  });

  const isResolving   = !!user && statusLoading && !statusData;
  const isPremium     = statusData?.is_premium ?? false;
  const currentStatus = statusData?.status ?? 'free';

  const { status: pushStatus, toggling: pushToggling, toggle: togglePush } = usePushNotification();

  const [showPayHistory, setShowPayHistory] = useState(false);
  const { data: payHistory = [], isLoading: payHistoryLoading } = useQuery({
    queryKey: ['payment-history'],
    queryFn:  subscriptionService.getHistory,
    enabled:  !!user && isPremium && showPayHistory,
  });

  const recentResults = useMemo(() =>
    [...rawPlans]
      .filter((p) => p.result !== null)
      .sort((a, b) => b.planned_date.localeCompare(a.planned_date))
      .slice(0, 8),
  [rawPlans]);

  const upcomingCount = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return rawPlans.filter((p) => {
      const d = new Date(p.planned_date); d.setHours(0,0,0,0);
      return d >= today && p.result === null;
    }).length;
  }, [rawPlans]);

  const passCount = rawPlans.filter((p) => p.result === 'passed').length;

  function startEditName() {
    setNameInput(user?.name ?? '');
    setNameError('');
    setEditingName(true);
  }

  async function saveName() {
    if (!nameInput.trim()) { setNameError('名前を入力してください'); return; }
    setNameSaving(true);
    setNameError('');
    try {
      const res = await apiClient.patch<{ success: boolean; data: { user: typeof user; token: string } }>(
        '/auth/me', { name: nameInput.trim() }
      );
      const { user: updated, token } = res.data.data;
      localStorage.setItem('auth-token', token);
      if (updated) updateUser(updated as Parameters<typeof updateUser>[0]);
      setEditingName(false);
    } catch {
      setNameError('保存に失敗しました');
    } finally {
      setNameSaving(false);
    }
  }

  function handleLogout() {
    logout();
    navigate(ROUTES.HOME, { replace: true });
  }

  async function handleManagePortal() {
    setPortalLoading(true);
    try {
      const { url } = await subscriptionService.openPortal();
      window.location.href = url;
    } catch {
      setPortalLoading(false);
      showToast('error', '管理ページへの遷移に失敗しました。しばらく経ってから再度お試しください。');
    }
  }

  async function downloadCsv(type: 'held' | 'wishlist' | 'plans') {
    setCsvExporting(type);
    try {
      const res = await apiClient.get(`/export/csv?type=${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      const names = { held: 'held-qualifications.csv', wishlist: 'wishlist.csv', plans: 'exam-plans.csv' };
      a.download = names[type];
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('error', 'CSVのダウンロードに失敗しました');
    } finally {
      setCsvExporting(null);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await apiClient.delete('/auth/me');
      logout();
      navigate(ROUTES.HOME, { replace: true });
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] page-enter">
      <div className="sticky top-0 z-20 bg-[var(--bg)] border-b border-[var(--border)]">
        <div className="max-w-lg mx-auto px-4 sm:px-8 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-[15px] font-extrabold text-[var(--text-1)]">マイページ</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 sm:px-8 py-6 space-y-4">
        {/* ── Checkout result banner ──────────── */}
        {checkoutBanner === 'success' && (
          <div className="flex items-start gap-3 p-4 rounded-2xl
                          bg-gradient-to-r from-emerald-500/10 to-emerald-600/5
                          border border-emerald-400/30">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">プレミアムへようこそ！</p>
              <p className="text-[12px] text-emerald-600/80 dark:text-emerald-500/80 mt-0.5">
                すべての機能がご利用いただけます。
              </p>
            </div>
            <button onClick={() => setCheckoutBanner(null)} className="text-emerald-400 hover:text-emerald-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {checkoutBanner === 'cancel' && (
          <div className="flex items-start gap-3 p-4 rounded-2xl
                          bg-[var(--surface-2)] border border-[var(--border)]">
            <AlertCircle className="w-5 h-5 text-[var(--text-3)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-[var(--text-2)]">お支払いをキャンセルしました</p>
              <p className="text-[12px] text-[var(--text-3)] mt-0.5">
                いつでも料金ページからアップグレードできます。
              </p>
            </div>
            <button onClick={() => setCheckoutBanner(null)} className="text-[var(--text-4)] hover:text-[var(--text-3)]">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── grace_period 警告バナー ────────── */}
        {currentStatus === 'grace_period' && (
          <div className="flex items-start gap-3 p-4 rounded-2xl
                          bg-orange-50 dark:bg-orange-900/10 border border-orange-300 dark:border-orange-700/40">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] font-bold text-orange-700 dark:text-orange-400">お支払いを確認できませんでした</p>
              <p className="text-[12px] text-orange-600/80 dark:text-orange-500/80 mt-0.5 leading-relaxed">
                決済方法を更新してください。3日以内に解決しない場合、プレミアムが停止されます。
              </p>
            </div>
            <button
              onClick={handleManagePortal}
              disabled={portalLoading}
              className="shrink-0 flex items-center gap-1 text-[11px] font-semibold
                         text-orange-600 dark:text-orange-400 hover:underline disabled:opacity-50"
            >
              {portalLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <ExternalLink className="w-3 h-3" />}
              確認する
            </button>
          </div>
        )}

        {/* ── trial 期間通知 ───────────────────── */}
        {currentStatus === 'trial' && statusData?.trial_ends_at && (() => {
          const today = new Date(); today.setHours(0,0,0,0);
          const end = new Date(statusData.trial_ends_at); end.setHours(0,0,0,0);
          const daysLeft = Math.round((end.getTime() - today.getTime()) / 86_400_000);
          const isUrgent = daysLeft <= 3;
          return (
            <div className={cn(
              'flex items-center gap-3 p-4 rounded-2xl border',
              isUrgent
                ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-300 dark:border-orange-700/40'
                : 'bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-amber-400/30'
            )}>
              <Crown className={cn('w-4 h-4 shrink-0', isUrgent ? 'text-orange-500' : 'text-amber-400')} strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-[13px] font-bold', isUrgent ? 'text-orange-700 dark:text-orange-400' : 'text-amber-700 dark:text-amber-400')}>
                  {isUrgent ? `トライアル終了まであと${daysLeft}日` : '7日間トライアル体験中'}
                </p>
                <p className={cn('text-[11px] mt-0.5', isUrgent ? 'text-orange-600/80 dark:text-orange-500/70' : 'text-amber-600/70 dark:text-amber-500/70')}>
                  終了日: {end.toLocaleDateString('ja-JP')} — {isUrgent ? 'プレミアムへの移行をお忘れなく' : 'プレミアム機能が無料で使えます'}
                </p>
              </div>
              <Link to={ROUTES.PRICING}
                className={cn('shrink-0 text-[11px] font-semibold hover:underline', isUrgent ? 'text-orange-600 dark:text-orange-400' : 'text-amber-600 dark:text-amber-400')}>
                {isUrgent ? 'アップグレード' : '詳細'}
              </Link>
            </div>
          );
        })()}

        {user ? (
          <>
            {/* ── Profile card ───────────────────── */}
            <div className="card p-5">
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center',
                  'text-white text-xl font-extrabold shrink-0',
                  'bg-gradient-to-br',
                  isAdmin ? 'from-violet-500 to-purple-700' : 'from-indigo-500 to-blue-600'
                )}>
                  {user.name[0]?.toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  {editingName ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                          className="flex-1 px-2.5 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-600
                                     bg-[var(--surface)] text-[14px] font-bold text-[var(--text-1)]
                                     focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={saveName} disabled={nameSaving}
                          className="w-7 h-7 flex items-center justify-center rounded-xl
                                     bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingName(false)}
                          className="w-7 h-7 flex items-center justify-center rounded-xl
                                     text-[var(--text-3)] hover:bg-[var(--surface-2)]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {nameError && <p className="text-[11px] text-red-500">{nameError}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[16px] font-bold text-[var(--text-1)] truncate">{user.name}</p>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                         bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300
                                         text-[10px] font-bold">
                          <Shield className="w-2.5 h-2.5" />ADMIN
                        </span>
                      )}
                      <button
                        onClick={startEditName}
                        className="p-1 rounded-lg text-[var(--text-4)] hover:text-indigo-500 hover:bg-indigo-50
                                   dark:hover:bg-indigo-900/20 transition-colors"
                        title="名前を変更"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-[13px] text-[var(--text-3)] truncate mt-0.5">{user.email}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Link to={ROUTES.HELD}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-[var(--surface-2)] active:scale-[0.97] transition-transform">
                  <Trophy className="w-4 h-4 text-emerald-500" />
                  <p className="text-[18px] font-extrabold text-[var(--text-1)] tabular-nums leading-none">{count}</p>
                  <p className="text-[10px] text-[var(--text-3)]">保有資格</p>
                </Link>
                <Link to={ROUTES.WISHLIST}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-[var(--surface-2)] active:scale-[0.97] transition-transform">
                  <Star className="w-4 h-4 text-pink-500" />
                  <p className="text-[18px] font-extrabold text-[var(--text-1)] tabular-nums leading-none">{wishlistCount}</p>
                  <p className="text-[10px] text-[var(--text-3)]">挑戦リスト</p>
                </Link>
                <Link to={ROUTES.CALENDAR}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-[var(--surface-2)] active:scale-[0.97] transition-transform">
                  <Calendar className="w-4 h-4 text-teal-500" />
                  <p className="text-[18px] font-extrabold text-[var(--text-1)] tabular-nums leading-none">{upcomingCount}</p>
                  <p className="text-[10px] text-[var(--text-3)]">受験予定</p>
                </Link>
              </div>
            </div>

            {/* ── Exam history ────────────────────── */}
            {recentResults.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-4 h-4 text-[var(--text-3)]" />
                  <h2 className="text-[13px] font-bold text-[var(--text-1)]">
                    受験履歴
                    <span className="ml-1.5 text-[11px] font-normal text-[var(--text-3)]">
                      合格 {passCount} 件
                    </span>
                  </h2>
                </div>
                <div className="space-y-1.5">
                  {recentResults.map((plan) => (
                    <div key={plan.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--surface-2)]">
                      {plan.result === 'passed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[var(--text-1)] truncate">
                          {plan.qualification_name}
                        </p>
                        <p className="text-[10px] text-[var(--text-3)]">
                          {new Date(plan.planned_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                        plan.result === 'passed'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      )}>
                        {plan.result === 'passed' ? '合格' : '不合格'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Subscription card ───────────────── */}
            {isResolving && (
              <div className="card p-4 h-[72px] animate-pulse bg-[var(--surface-2)] rounded-2xl" />
            )}
            {!isResolving && !isPremium && (
              <Link to={ROUTES.PRICING}
                className="relative overflow-hidden card p-4 flex items-center gap-3.5
                           active:scale-[0.99] transition-transform
                           bg-gradient-to-r from-[#120d00]/40 to-[#1e1600]/20
                           border-amber-500/25">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0
                                bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30">
                  <Crown className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[14px] font-bold text-[var(--text-1)]">プレミアムにアップグレード</p>
                    <PremiumBadge size="xs" />
                  </div>
                  <p className="text-[11px] text-[var(--text-3)]">無制限登録・申込期限アラート ¥480/月〜</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-500 shrink-0" />
              </Link>
            )}
            {!isResolving && isPremium && (
              <div className="relative overflow-hidden card p-4
                              bg-gradient-to-r from-[#120d00]/40 to-[#1e1600]/20
                              border-amber-500/30">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0
                                  bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30">
                    <Crown className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[14px] font-bold text-[var(--text-1)]">
                        {currentStatus === 'trial' ? 'トライアル体験中' : 'プレミアム利用中'}
                      </p>
                      <PremiumBadge size="xs" />
                    </div>
                    <p className="text-[11px] text-[var(--text-3)]">
                      {statusData?.expires_at
                        ? `${currentStatus === 'canceled' ? '有効期限' : currentStatus === 'trial' ? 'トライアル終了' : '次回更新'}：${new Date(statusData.expires_at).toLocaleDateString('ja-JP')}`
                        : 'プラン管理はこちら'}
                    </p>
                  </div>
                  {currentStatus !== 'trial' && (
                    <button
                      onClick={handleManagePortal}
                      disabled={portalLoading}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl
                                 text-[11px] font-semibold text-amber-500 border border-amber-500/30
                                 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                    >
                      {portalLoading
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <ExternalLink className="w-3 h-3" />}
                      管理
                    </button>
                  )}
                  {currentStatus === 'trial' && (
                    <Link to={ROUTES.PRICING}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl
                                 text-[11px] font-semibold text-amber-500 border border-amber-500/30
                                 hover:bg-amber-500/10 transition-colors">
                      <ChevronRight className="w-3 h-3" />
                      プランへ
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* ── CSV export (premium) ────────────── */}
            {!isResolving && isPremium && (
              <div className="card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-500" />
                  <h2 className="text-[13px] font-bold text-[var(--text-1)]">データエクスポート</h2>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full
                                   bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    Premium
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-3)]">CSV形式でダウンロード。Excelなどで開けます。</p>
                <div className="grid grid-cols-3 gap-2">
                  {([ ['held', '保有資格'], ['wishlist', 'ウィッシュリスト'], ['plans', '受験計画'] ] as const).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => downloadCsv(type)}
                      disabled={csvExporting !== null}
                      className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl
                                 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors
                                 text-[11px] font-semibold text-[var(--text-2)] disabled:opacity-50
                                 active:scale-95"
                    >
                      {csvExporting === type
                        ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        : <Download className="w-4 h-4 text-indigo-500" />}
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    setCsvExporting('all');
                    try {
                      const res = await apiClient.get('/export/csv?type=all', { responseType: 'blob' });
                      const url = URL.createObjectURL(res.data as Blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'exam-schedule-export.csv'; a.click();
                      URL.revokeObjectURL(url);
                    } catch { /* ignore */ } finally { setCsvExporting(null); }
                  }}
                  disabled={csvExporting !== null}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
                             bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold
                             transition-colors disabled:opacity-50 active:scale-[0.98]"
                >
                  {csvExporting === 'all'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5" />}
                  全データを一括ダウンロード
                </button>
              </div>
            )}

            {/* ── Payment history (premium) ────────── */}
            {!isResolving && isPremium && currentStatus !== 'trial' && (
              <div className="card p-4 space-y-3">
                <button
                  onClick={() => setShowPayHistory((v) => !v)}
                  className="w-full flex items-center gap-2 text-left"
                >
                  <Receipt className="w-4 h-4 text-indigo-500 shrink-0" />
                  <h2 className="text-[13px] font-bold text-[var(--text-1)] flex-1">決済履歴</h2>
                  <ChevronRight className={cn(
                    'w-4 h-4 text-[var(--text-3)] transition-transform',
                    showPayHistory && 'rotate-90'
                  )} />
                </button>

                {showPayHistory && (
                  <div className="space-y-2">
                    {payHistoryLoading ? (
                      <div className="space-y-2">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="h-12 rounded-xl bg-[var(--surface-2)] animate-pulse" />
                        ))}
                      </div>
                    ) : payHistory.length === 0 ? (
                      <p className="text-[12px] text-[var(--text-3)] text-center py-3">
                        決済履歴がありません
                      </p>
                    ) : (
                      payHistory.map((p, i) => (
                        <div key={i}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--surface-2)]">
                          <div className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            p.status === 'paid' ? 'bg-emerald-500' : 'bg-red-400'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-[var(--text-1)] truncate">
                              {p.plan_name ?? p.plan_code}
                            </p>
                            <p className="text-[10px] text-[var(--text-3)]">
                              {p.paid_at
                                ? new Date(p.paid_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
                                : '–'}
                              {p.period_start && p.period_end && (
                                <span className="ml-1">
                                  ({new Date(p.period_start).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                                  {' – '}
                                  {new Date(p.period_end).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })})
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[13px] font-bold text-[var(--text-1)] tabular-nums">
                              ¥{p.amount_jpy.toLocaleString()}
                            </p>
                            <p className={cn(
                              'text-[10px] font-semibold',
                              p.status === 'paid' ? 'text-emerald-500' : 'text-red-400'
                            )}>
                              {p.status === 'paid' ? '支払済' : p.status === 'open' ? '未払' : p.status}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Settings list ───────────────────── */}
            <div className="card divide-y divide-[var(--border)]">
              <Link to={ROUTES.ROADMAP}
                className="flex items-center gap-3.5 px-5 py-4 hover:bg-[var(--surface-2)] transition-colors rounded-t-2xl">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <Map className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[var(--text-1)]">ロードマップ</p>
                  <p className="text-[11px] text-[var(--text-3)]">資格の取得順序を確認</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-3)]" />
              </Link>

              <Link to={ROUTES.CALENDAR}
                className="flex items-center gap-3.5 px-5 py-4 hover:bg-[var(--surface-2)] transition-colors">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[var(--text-1)]">試験カレンダー</p>
                  <p className="text-[11px] text-[var(--text-3)]">試験スケジュールを一覧表示</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-3)]" />
              </Link>

              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3.5 px-5 py-4 text-left
                           hover:bg-[var(--surface-2)] transition-colors active:scale-[0.99]"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  {theme === 'dark'
                    ? <Sun className="w-4 h-4 text-amber-500" />
                    : <Moon className="w-4 h-4 text-amber-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[var(--text-1)]">
                    {theme === 'dark' ? 'ライトモード' : 'ダークモード'}
                  </p>
                  <p className="text-[11px] text-[var(--text-3)]">テーマを切り替え</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-3)]" />
              </button>

              {pushStatus !== 'unsupported' && (
                <button
                  onClick={togglePush}
                  disabled={pushToggling || pushStatus === 'loading'}
                  className="w-full flex items-center gap-3.5 px-5 py-4 text-left
                             hover:bg-[var(--surface-2)] transition-colors active:scale-[0.99] disabled:opacity-60"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                    pushStatus === 'subscribed'
                      ? 'bg-indigo-100 dark:bg-indigo-900/30'
                      : 'bg-[var(--surface-2)]'
                  )}>
                    {pushStatus === 'subscribed'
                      ? <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      : <BellOff className="w-4 h-4 text-[var(--text-3)]" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-[var(--text-1)]">Push通知</p>
                    <p className="text-[11px] text-[var(--text-3)]">
                      {pushStatus === 'subscribed'
                        ? isPremium
                          ? '有効 — 1ヶ月前・7日前・前日に通知します'
                          : '有効 — 試験前日に通知します'
                        : pushStatus === 'denied'
                          ? 'ブラウザで通知を許可してください'
                          : isPremium
                            ? '申込期限・合格発表も含めてお知らせ'
                            : '試験前日にお知らせ（プレミアムで拡張）'}
                    </p>
                  </div>
                  {pushToggling
                    ? <div className="w-4 h-4 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                    : <div className={cn(
                        'w-10 h-6 rounded-full transition-colors relative',
                        pushStatus === 'subscribed' ? 'bg-indigo-600' : 'bg-[var(--surface-3)]'
                      )}>
                        <div className={cn(
                          'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all',
                          pushStatus === 'subscribed' ? 'left-5' : 'left-1'
                        )} />
                      </div>}
                </button>
              )}

              {isAdmin && (
                <Link to={ROUTES.ADMIN}
                  className="flex items-center gap-3.5 px-5 py-4 hover:bg-[var(--surface-2)] transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                    <Settings className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-[var(--text-1)]">管理画面</p>
                    <p className="text-[11px] text-[var(--text-3)]">資格・スケジュールの管理</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-3)]" />
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3.5 px-5 py-4 text-left
                           hover:bg-red-50 dark:hover:bg-red-500/[0.06] transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-red-600 dark:text-red-400">ログアウト</p>
                  <p className="text-[11px] text-[var(--text-3)]">アカウントからサインアウト</p>
                </div>
              </button>

              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full flex items-center gap-3.5 px-5 py-4 text-left
                           hover:bg-red-50 dark:hover:bg-red-500/[0.06] transition-colors rounded-b-2xl"
              >
                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-red-600 dark:text-red-400">アカウントを削除</p>
                  <p className="text-[11px] text-[var(--text-3)]">データを完全に削除します（取消不可）</p>
                </div>
              </button>
            </div>

            {/* ── Delete confirmation modal ──────── */}
            {deleteConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-[var(--surface)] rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-[15px] font-extrabold text-[var(--text-1)]">アカウントを削除しますか？</p>
                      <p className="text-[11px] text-[var(--text-3)]">この操作は取り消せません</p>
                    </div>
                  </div>
                  <p className="text-[13px] text-[var(--text-2)] leading-relaxed">
                    保有資格・受験予定・スコア履歴など<strong>すべてのデータが完全に削除</strong>されます。
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      disabled={deleting}
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-[var(--surface-2)]
                                 text-[13px] font-semibold text-[var(--text-1)]
                                 hover:bg-[var(--surface-3)] transition-colors disabled:opacity-50"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-red-600 text-white
                                 text-[13px] font-semibold hover:bg-red-700 transition-colors
                                 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {deleting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {deleting ? '削除中...' : '削除する'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="card p-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl mx-auto
                              bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600
                              flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <GraduationCap className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-[17px] font-bold text-[var(--text-1)]">ログインしてください</h2>
                <p className="text-[13px] text-[var(--text-3)] leading-relaxed">
                  ログインすると保有資格の管理や<br />カレンダーの確認ができます
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link to={ROUTES.LOGIN} className="btn-primary w-full">
                  <LogIn className="w-4 h-4" />ログイン
                </Link>
                <Link to={ROUTES.REGISTER} className="btn-secondary w-full">
                  <UserPlus className="w-4 h-4" />新規登録（無料）
                </Link>
              </div>
            </div>

            <div className="card divide-y divide-[var(--border)]">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3.5 px-5 py-4 text-left
                           hover:bg-[var(--surface-2)] transition-colors rounded-2xl"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  {theme === 'dark'
                    ? <Sun className="w-4 h-4 text-amber-500" />
                    : <Moon className="w-4 h-4 text-amber-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[var(--text-1)]">
                    {theme === 'dark' ? 'ライトモード' : 'ダークモード'}
                  </p>
                  <p className="text-[11px] text-[var(--text-3)]">テーマを切り替え</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-3)]" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="h-4" />
    </div>
  );
}
