import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

const APP_NAME = '資格スケジュール';
const CONTACT_EMAIL = 'support@shikaku-schedule.app';
const LAST_UPDATED = '2026年6月1日';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        to={ROUTES.HOME}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-3)] hover:text-[var(--text-2)] mb-6"
      >
        <ArrowLeft size={16} />
        ホームへ戻る
      </Link>

      <h1 className="text-2xl font-bold mb-2">利用規約</h1>
      <p className="text-sm text-[var(--text-3)] mb-8">最終更新日：{LAST_UPDATED}</p>

      <div className="space-y-8 text-[var(--text-1)] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-3">第1条（適用）</h2>
          <p className="text-sm">
            本規約は、{APP_NAME}（以下「当サービス」）の利用に関して適用されます。
            ユーザーは、アカウント登録をもって本規約に同意したものとみなします。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第2条（アカウント）</h2>
          <ul className="ml-4 list-disc space-y-1 text-sm">
            <li>登録は1人1アカウントに限ります。</li>
            <li>アカウント情報の管理はユーザー自身の責任で行ってください。</li>
            <li>不正利用が確認された場合、アカウントを停止することがあります。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第3条（無料トライアル・有料プラン）</h2>
          <ul className="ml-4 list-disc space-y-1 text-sm">
            <li>新規登録時に7日間の無料トライアルが開始されます（クレジットカード不要）。</li>
            <li>トライアル期間終了後は自動的に無料プランに移行します。</li>
            <li>有料プランはStripeを通じて決済されます。</li>
            <li>解約後も登録済みのデータはアカウント内に保持されます。</li>
            <li>7日以内の返金請求に応じます。詳細はサポートまでお問い合わせください。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第4条（禁止事項）</h2>
          <ul className="ml-4 list-disc space-y-1 text-sm">
            <li>当サービスへの不正アクセス・改ざん・データの大量取得</li>
            <li>他のユーザーや第三者への迷惑行為</li>
            <li>法令または公序良俗に反する行為</li>
            <li>当サービスの運営を妨げる行為</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第5条（免責事項）</h2>
          <p className="text-sm">
            当サービスは、資格情報・試験日程の正確性を保証しません。
            最新情報は必ず各試験実施機関の公式サイトでご確認ください。
            当サービスの利用により生じた損害について、運営者は責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第6条（サービスの変更・停止）</h2>
          <p className="text-sm">
            運営者は、ユーザーへの事前通知なしにサービス内容の変更や停止を行うことがあります。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第7条（準拠法・管轄裁判所）</h2>
          <p className="text-sm">
            本規約の解釈は日本法に準拠し、紛争が生じた場合は東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">第8条（お問い合わせ）</h2>
          <p className="text-sm">
            本規約に関するご質問は{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-500 hover:underline">
              {CONTACT_EMAIL}
            </a>{' '}
            までご連絡ください。
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-[var(--border)] flex gap-4 text-xs text-[var(--text-3)]">
        <Link to={ROUTES.PRIVACY} className="hover:underline">プライバシーポリシー</Link>
        <Link to={ROUTES.TOKUSHO} className="hover:underline">特定商取引法に基づく表記</Link>
        <Link to={ROUTES.SUPPORT} className="hover:underline">サポート</Link>
      </div>
    </div>
  );
}
