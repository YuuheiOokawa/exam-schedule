import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, GraduationCap, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();
  const from             = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.HOME;

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [error,       setError]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  if (user) {
    navigate(ROUTES.PROFILE, { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('メールアドレスとパスワードを入力してください'); return; }
    setError(''); setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'ログインに失敗しました';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col overflow-hidden page-enter" style={{
      background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 70%), var(--bg)',
    }}>
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-24 w-72 h-72 rounded-full
                        bg-indigo-500/5 dark:bg-indigo-500/8 blur-3xl" />
        <div className="absolute bottom-1/4 -right-24 w-72 h-72 rounded-full
                        bg-violet-500/5 dark:bg-violet-500/8 blur-3xl" />
      </div>

      {/* Back nav */}
      <div className="px-4 py-3 shrink-0 relative z-10">
        <Link
          to={ROUTES.HOME}
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-3)]
                     hover:text-[var(--text-1)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          ホームに戻る
        </Link>
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-y-auto py-4 relative z-10">
        <div className="w-full max-w-sm animate-fade-up">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-5">
              <div className="absolute inset-0 rounded-3xl bg-indigo-500/30 blur-xl scale-110" />
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-3xl
                              bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600
                              shadow-2xl shadow-indigo-500/40">
                <GraduationCap className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="text-[24px] font-extrabold text-[var(--text-1)] tracking-tight">
              ログイン
            </h1>
            <p className="mt-1.5 text-[13px] text-[var(--text-3)]">
              資格スケジュール管理アプリ
            </p>
          </div>

          {/* Form card */}
          <div className="card p-6 space-y-4"
               style={{ boxShadow: '0 4px 32px rgba(99,102,241,0.1), 0 1px 4px rgba(0,0,0,0.06)' }}>
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl
                              bg-red-50 dark:bg-red-900/20
                              border border-red-200 dark:border-red-800/40">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[13px] text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-[var(--text-2)] tracking-wide">
                  メールアドレス
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="メールアドレス"
                  className="input-base"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-[var(--text-2)] tracking-wide">
                  パスワード
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワード"
                    className="input-base pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2
                               text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                    aria-label={showPw ? 'パスワードを隠す' : 'パスワードを表示'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link
                  to={ROUTES.FORGOT_PASSWORD}
                  className="text-[12px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  パスワードを忘れた方はこちら
                </Link>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full mt-2"
              >
                {submitting
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : null}
                {submitting ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>

          </div>

          {/* Register link */}
          <p className="mt-5 text-center text-[13px] text-[var(--text-3)]">
            アカウントをお持ちでない方は{' '}
            <Link
              to={ROUTES.REGISTER}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
