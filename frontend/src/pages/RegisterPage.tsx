import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, GraduationCap, ArrowLeft, Eye, EyeOff, UserPlus } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

export default function RegisterPage() {
  const { user, loginWithToken } = useAuth();
  const navigate = useNavigate();

  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    navigate(ROUTES.HOME, { replace: true });
    return null;
  }

  function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
    if (pw.length === 0) return 0;
    if (pw.length < 8)   return 1;
    if (pw.length < 12)  return 2;
    return 3;
  }

  const strength = passwordStrength(password);
  const strengthLabel = ['', '弱い', 'ふつう', '強い'][strength];
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-emerald-400'][strength];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim())      { setError('ユーザーIDを入力してください'); return; }
    if (!email)            { setError('メールアドレスを入力してください'); return; }
    if (password.length < 8) { setError('パスワードは8文字以上にしてください'); return; }
    if (password !== confirm) { setError('パスワードが一致しません'); return; }

    setError('');
    setSubmitting(true);
    try {
      const res = await apiClient.post<{ success: true; data: { token: string; user: AuthUser } }>(
        '/auth/signup-direct',
        { email, name: name.trim(), password }
      );
      const { token, user: u } = res.data.data;
      loginWithToken(token, u);
      navigate(ROUTES.HOME, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? '登録に失敗しました。しばらくしてからお試しください。';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden">
      {/* Back nav */}
      <div className="px-4 py-3 shrink-0">
        <Link
          to={ROUTES.LOGIN}
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-3)]
                     hover:text-[var(--text-1)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          ログインに戻る
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 overflow-y-auto py-4">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl
                            bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600
                            shadow-xl shadow-indigo-500/25 mb-5">
              <GraduationCap className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-[22px] font-extrabold text-[var(--text-1)] tracking-tight">
              アカウント登録
            </h1>
            <p className="mt-1.5 text-[13px] text-[var(--text-3)]">
              無料で始められます・7日間トライアル付き
            </p>
          </div>

          {/* Form card */}
          <div className="card p-5 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl
                              bg-red-50 dark:bg-red-900/20
                              border border-red-200 dark:border-red-800/40">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[13px] text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ユーザーID */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-[var(--text-2)] tracking-wide">
                  ユーザーID
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: taro123"
                  className="input-base"
                />
              </div>

              {/* メールアドレス */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-[var(--text-2)] tracking-wide">
                  メールアドレス
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input-base"
                />
              </div>

              {/* パスワード */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-[var(--text-2)] tracking-wide">
                  パスワード（8文字以上）
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-base pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)]"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* 強度インジケーター */}
                {password.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={cn(
                            'h-1 flex-1 rounded-full transition-colors',
                            strength >= level ? strengthColor : 'bg-slate-200 dark:bg-slate-700'
                          )}
                        />
                      ))}
                    </div>
                    <span className={cn(
                      'text-[11px] font-semibold',
                      strength === 1 ? 'text-red-500' : strength === 2 ? 'text-yellow-500' : 'text-emerald-500'
                    )}>
                      {strengthLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* パスワード確認 */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-[var(--text-2)] tracking-wide">
                  パスワード（確認）
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className={cn(
                    'input-base',
                    confirm && password !== confirm ? 'border-red-400 dark:border-red-600' : '',
                    confirm && password === confirm && confirm.length > 0 ? 'border-emerald-400 dark:border-emerald-600' : ''
                  )}
                />
                {confirm && password !== confirm && (
                  <p className="text-[11px] text-red-500">パスワードが一致しません</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full mt-2"
              >
                {submitting
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <UserPlus className="w-4 h-4" />}
                {submitting ? '登録中...' : 'アカウントを作成'}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-[13px] text-[var(--text-3)]">
            すでにアカウントをお持ちの方は{' '}
            <Link
              to={ROUTES.LOGIN}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
