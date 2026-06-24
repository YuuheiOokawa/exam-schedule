import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/api';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

export default function EmailSentPage() {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email ?? '';
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function handleResend() {
    if (!email || resendStatus === 'loading') return;
    setResendStatus('loading');
    try {
      await apiClient.post('/auth/signup', { email, name: 'ユーザー' });
      setResendStatus('done');
    } catch {
      setResendStatus('error');
    }
  }

  return (
    <div className="h-screen flex items-center justify-center px-4 overflow-y-auto bg-[var(--bg)]">
      <div className="w-full max-w-sm text-center space-y-6">
        {/* アイコン */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/40 dark:to-brand-800/30 flex items-center justify-center shadow-lg">
            <Mail className="w-10 h-10 text-brand-600 dark:text-brand-400" />
          </div>
        </div>

        {/* メッセージ */}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            メールを送信しました
          </h1>
          {email && (
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong className="text-slate-700 dark:text-slate-200">{email}</strong> に<br />
              確認メールを送信しました
            </p>
          )}
          <p className="text-sm text-slate-400 dark:text-slate-500">
            メール内のリンクをクリックしてパスワードを設定してください。<br />
            リンクの有効期限は<strong>24時間</strong>です。
          </p>
        </div>

        {/* ステップ案内 */}
        <div className="card p-5 text-left space-y-3">
          {[
            { step: '1', text: 'メールボックスを確認する' },
            { step: '2', text: '「メールアドレスを確認する」をクリック' },
            { step: '3', text: 'パスワードを設定してログイン' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{step}</span>
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-300">{text}</span>
            </div>
          ))}
        </div>

        {/* 再送信 */}
        {email && (
          <div className="space-y-2">
            {resendStatus === 'done' && (
              <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                再送信しました
              </div>
            )}
            {resendStatus === 'error' && (
              <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                送信に失敗しました
              </div>
            )}
            <button
              onClick={handleResend}
              disabled={resendStatus === 'loading' || resendStatus === 'done'}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl',
                'border border-slate-200 dark:border-slate-700',
                'text-slate-600 dark:text-slate-300 text-sm font-medium',
                'hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <RefreshCw className={cn('w-4 h-4', resendStatus === 'loading' && 'animate-spin')} />
              {resendStatus === 'loading' ? '送信中...' : 'メールを再送信'}
            </button>
          </div>
        )}

        <Link
          to={ROUTES.LOGIN}
          className="block text-sm text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          ← ログインページへ戻る
        </Link>
      </div>
    </div>
  );
}
