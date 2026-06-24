import { useState, useEffect, type FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle, GraduationCap } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

type Status = 'verifying' | 'ready' | 'invalid' | 'expired' | 'done';

export default function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const { loginWithToken, user } = useAuth();

  const [status, setStatus] = useState<Status>('verifying');
  const [userInfo, setUserInfo] = useState<{ email: string; name: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    navigate(ROUTES.HOME, { replace: true });
    return null;
  }

  // トークン検証
  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    apiClient.post<{ success: true; data: { email: string; name: string } }>('/auth/verify-token', { token })
      .then((res) => {
        setUserInfo(res.data.data);
        setStatus('ready');
      })
      .catch((err) => {
        const code = (err as { response?: { data?: { error?: { code?: string } } } })
          ?.response?.data?.error?.code;
        setStatus(code === 'TOKEN_EXPIRED' ? 'expired' : 'invalid');
      });
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError('パスワードは8文字以上にしてください'); return; }
    if (password !== confirm) { setError('パスワードが一致しません'); return; }
    setError('');
    setIsSubmitting(true);

    try {
      const res = await apiClient.post<{ success: true; data: { token: string; user: AuthUser } }>(
        '/auth/complete', { token, password }
      );
      const { token: jwt, user: u } = res.data.data;
      loginWithToken(jwt, u);
      setStatus('done');
      setTimeout(() => navigate(ROUTES.HOME, { replace: true }), 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'エラーが発生しました';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center px-4 overflow-y-auto bg-[var(--bg)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/20 mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            パスワードの設定
          </h1>
          {userInfo && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {userInfo.name} さん ({userInfo.email})
            </p>
          )}
        </div>

        {/* 検証中 */}
        {status === 'verifying' && (
          <div className="card p-8 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">リンクを確認中...</p>
          </div>
        )}

        {/* 無効なリンク */}
        {(status === 'invalid' || status === 'expired') && (
          <div className="card p-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <div className="space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-100">
                {status === 'expired' ? 'リンクの有効期限が切れています' : 'リンクが無効です'}
              </p>
              <p className="text-sm text-slate-500">
                {status === 'expired'
                  ? '有効期限は24時間です。再度メールを送信してください。'
                  : '正しいリンクからアクセスしてください。'}
              </p>
            </div>
            <Link
              to={ROUTES.REGISTER}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
            >
              再度メールを送信する
            </Link>
          </div>
        )}

        {/* 登録完了 */}
        {status === 'done' && (
          <div className="card p-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <div className="space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-100">登録完了！</p>
              <p className="text-sm text-slate-500">ホームページへリダイレクトします...</p>
            </div>
          </div>
        )}

        {/* パスワード入力フォーム */}
        {status === 'ready' && (
          <div className="card p-6 space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  パスワード (8文字以上)
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={cn(
                      'w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm',
                      'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
                      'border-slate-200 dark:border-slate-700',
                      'placeholder-slate-400 dark:placeholder-slate-500',
                      'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* パスワード強度インジケーター */}
                {password.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {[8, 12, 16].map((len) => (
                      <div
                        key={len}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          password.length >= len
                            ? len === 8 ? 'bg-red-400' : len === 12 ? 'bg-yellow-400' : 'bg-emerald-400'
                            : 'bg-slate-200 dark:bg-slate-700'
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  パスワード (確認)
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl border text-sm',
                    'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
                    confirm && password !== confirm
                      ? 'border-red-400 dark:border-red-600'
                      : confirm && password === confirm
                      ? 'border-emerald-400 dark:border-emerald-600'
                      : 'border-slate-200 dark:border-slate-700',
                    'placeholder-slate-400 dark:placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all'
                  )}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl',
                  'bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm',
                  'shadow-sm shadow-brand-600/20 transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                  'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                {isSubmitting ? '登録中...' : 'パスワードを設定してログイン'}
              </button>
            </form>
          </div>
        )}

        <p className="mt-4 text-center text-sm text-slate-400">
          <Link to={ROUTES.LOGIN} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            ← ログインページへ戻る
          </Link>
        </p>
      </div>
    </div>
  );
}
