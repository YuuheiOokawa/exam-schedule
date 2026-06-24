import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Mail, CheckCircle2 } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { apiClient } from '@/services/api';

export default function ForgotPasswordPage() {
  const [email,      setEmail]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [sent,       setSent]       = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) { setError('メールアドレスを入力してください'); return; }
    setError(''); setSubmitting(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('エラーが発生しました。しばらく経ってからお試しください。');
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
              パスワードをお忘れの方
            </h1>
            <p className="mt-1.5 text-[13px] text-[var(--text-3)]">
              登録メールアドレスにリセットリンクを送信します
            </p>
          </div>

          {sent ? (
            <div className="card p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30
                              flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <div className="space-y-2">
                <p className="text-[15px] font-bold text-[var(--text-1)]">メールを送信しました</p>
                <p className="text-[13px] text-[var(--text-3)] leading-relaxed">
                  登録されているメールアドレスに<br />パスワードリセット用のリンクを送信しました。<br />
                  メールをご確認ください。
                </p>
                <p className="text-[11px] text-[var(--text-3)] mt-3">
                  ※ リンクの有効期限は1時間です
                </p>
              </div>
              <Link
                to={ROUTES.LOGIN}
                className="btn-primary inline-flex w-full mt-2"
              >
                ログインページへ
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
                    メールアドレス
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="登録したメールアドレス"
                      className="input-base pl-10"
                    />
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
                  {submitting ? '送信中...' : 'リセットメールを送信'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
