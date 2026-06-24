import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MessageCircle } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

const CONTACT_EMAIL = 'support@shikaku-schedule.app';

export default function SupportPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        to={ROUTES.HOME}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-3)] hover:text-[var(--text-2)] mb-6"
      >
        <ArrowLeft size={16} />
        ホームへ戻る
      </Link>

      <h1 className="text-2xl font-bold mb-2">サポート</h1>
      <p className="text-sm text-[var(--text-3)] mb-8">
        資格スケジュールに関するご質問・ご要望はこちらからどうぞ。
      </p>

      <div className="space-y-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Mail size={20} className="text-blue-500" />
            <h2 className="font-semibold">メールでのお問い合わせ</h2>
          </div>
          <p className="text-sm text-[var(--text-3)] mb-3">
            通常3営業日以内にご返信いたします。
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Mail size={15} />
            {CONTACT_EMAIL}
          </a>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <MessageCircle size={20} className="text-emerald-500" />
            <h2 className="font-semibold">よくある質問</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: '無料トライアルはいつ終わりますか？',
                a: 'アカウント登録から7日間です。終了後は自動的に無料プランに移行します。',
              },
              {
                q: 'プレミアムを解約するにはどうすればいいですか？',
                a: 'プロフィールページの「プランを管理」からStripeポータルにアクセスし、いつでも解約できます。',
              },
              {
                q: '解約後もデータは残りますか？',
                a: 'はい。解約後もご自身でアカウントを削除しない限り、登録済みのデータはすべて保持されます。',
              },
              {
                q: '返金はできますか？',
                a: '購入から7日以内であれば返金対応いたします。上記メールアドレスまでご連絡ください。',
              },
              {
                q: '試験日程の情報はどこから取得していますか？',
                a: '各試験実施機関の公式サイトから定期取得しています。最新情報は公式サイトでご確認ください。',
              },
            ].map(({ q, a }) => (
              <details key={q} className="group">
                <summary className="cursor-pointer text-sm font-medium list-none flex justify-between items-center py-2 border-b border-[var(--border)]">
                  {q}
                  <span className="text-[var(--text-3)] group-open:rotate-180 transition-transform inline-block ml-2">▾</span>
                </summary>
                <p className="text-sm text-[var(--text-3)] pt-2 pb-1">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-[var(--border)] flex gap-4 text-xs text-[var(--text-3)]">
        <Link to={ROUTES.PRIVACY} className="hover:underline">プライバシーポリシー</Link>
        <Link to={ROUTES.TERMS}   className="hover:underline">利用規約</Link>
        <Link to={ROUTES.TOKUSHO} className="hover:underline">特定商取引法に基づく表記</Link>
      </div>
    </div>
  );
}
