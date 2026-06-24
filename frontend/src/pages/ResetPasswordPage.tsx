import { useState, type FormEvent } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, GraduationCap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { apiClient } from '@/services/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const token           = searchParams.get('token') ?? '';

  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [showCf,      setShowCf]      = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [done,        setDone]        = useState(false);

  if (!token) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg)] p-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30
                          flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>
          <div className="space-y-2">
            <p className="text-[16px] font-bold text-[var(--text-1)]">リンクが無効です</p>
            <p className="text-[13px] text-[var(--text-3)]">
              このページのURLが正しくありません。<br />
              もう一度パスワードリセットをお試しください。
            </p>
          </div>
          <Link to={ROUTES.FORGOT_PASSWORD} className="btn-primary inline-flex w-full">
            パスワードリセットページへ
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) { setError('新しいパスワードを入力してください'); return; }
    if (password.length < 8) { setError('パスワードは8文字以上にしてください'); return; }
    if (password !== confirm) { setError('パスワードが一致しません'); return; }

    setError(''); setSubmitting(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'エラーが発生しました。もう一度お試しください。';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] overflow-hidden">
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

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl
                            bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600
                            shadow-xl shadow-indigo-500/25 mb-5">
              <GraduationCap className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-[22px] font-extrabold text-[var(--text-1)] tracking-tight">
              新しいパスワードを設定
            </h1>
            <p className="mt-1.5 text-[13px] text-[var(--text-3)]">
              8文字以上のパスワードを入力してください
            </p>
          </div>

          {done ? (
            <div className="card p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30
                              flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <div className="space-y-2">
                <p className="text-[15px] font-bold text-[var(--text-1)]">パスワードを変更しました</p>
                <p className="text-[13px] text-[var(--text-3)]">
                  3秒後にログインページへ移動します...
                </p>
              </div>
              <Link to={ROUTES.LOGIN} className="btn-primary inline-flex w-full">
                今すぐログイン
              </Link>
            </div>
          ) : (
            <div className="card p-5 space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20
                                border border-red-200 dark:border-red-800/40">
                  <p className="text-[13px] text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-bold text-[var(--text-2)] tracking-wide">
                    新しいパスワード
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="8文字以上"
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

                <div className="space-y-1.5">
                  <label className="block text-[12px] font-bold text-[var(--text-2)] tracking-wide">
                    パスワード（確認）
                  </label>
                  <div className="relative">
                    <input
                      type={showCf ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="もう一度入力"
                      className="input-base pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCf((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2
                                 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                      aria-label={showCf ? 'パスワードを隠す' : 'パスワードを表示'}
                    >
                      {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full mt-2"
                >
                  {submitting
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : null}
                  {submitting ? '変更中...' : 'パスワードを変更する'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
