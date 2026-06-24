import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

const APP_NAME = '資格スケジュール';
const CONTACT_EMAIL = 'support@shikaku-schedule.app';
const LAST_UPDATED = '2026年6月1日';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        to={ROUTES.HOME}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-3)] hover:text-[var(--text-2)] mb-6"
      >
        <ArrowLeft size={16} />
        ホームへ戻る
      </Link>

      <h1 className="text-2xl font-bold mb-2">プライバシーポリシー</h1>
      <p className="text-sm text-[var(--text-3)] mb-8">最終更新日：{LAST_UPDATED}</p>

      <div className="space-y-8 text-[var(--text-1)] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-3">1. 取得する情報</h2>
          <p>当サービス（{APP_NAME}）は、以下の情報を取得します。</p>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
            <li>メールアドレス・氏名（アカウント登録時）</li>
            <li>保有資格・ウィッシュリスト・受験予定などのご入力情報</li>
            <li>ご利用状況（アクセスログ、機能利用履歴）</li>
            <li>決済情報（Stripe社が処理。カード番号はAntena側に保存しません）</li>
            <li>Push通知用の購読情報（端末・ブラウザ識別子）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. 情報の利用目的</h2>
          <ul className="ml-4 list-disc space-y-1 text-sm">
            <li>サービスの提供および機能の向上</li>
            <li>試験日程リマインダー等の通知送信</li>
            <li>お問い合わせへの対応</li>
            <li>課金・決済処理</li>
            <li>不正利用の検知・防止</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. 第三者への提供</h2>
          <p className="text-sm">
            法令に基づく場合を除き、ユーザーの同意なしに個人情報を第三者に提供しません。
            ただし、以下の外部サービスを利用しています。
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
            <li>Stripe, Inc.（決済処理）</li>
            <li>Neon Technologies, Inc.（データベースホスティング）</li>
            <li>Vercel Inc.（フロントエンドホスティング）</li>
            <li>Railway Corporation（バックエンドホスティング）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. データの保存・削除</h2>
          <p className="text-sm">
            ユーザーが退会した場合、アカウントおよび関連データは削除されます。
            ただし、法令上保存が義務付けられているデータは例外です。
            削除はアカウント設定画面から行えます。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Cookie・ローカルストレージ</h2>
          <p className="text-sm">
            当サービスは認証トークンをブラウザのローカルストレージに保存します。
            広告目的のCookieは使用していません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. セキュリティ</h2>
          <p className="text-sm">
            パスワードはbcryptでハッシュ化して保存します。通信はTLS（HTTPS）で暗号化されています。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. お問い合わせ</h2>
          <p className="text-sm">
            プライバシーに関するご質問は{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-500 hover:underline">
              {CONTACT_EMAIL}
            </a>{' '}
            までご連絡ください。
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-[var(--border)] flex gap-4 text-xs text-[var(--text-3)]">
        <Link to={ROUTES.TERMS}   className="hover:underline">利用規約</Link>
        <Link to={ROUTES.TOKUSHO} className="hover:underline">特定商取引法に基づく表記</Link>
        <Link to={ROUTES.SUPPORT} className="hover:underline">サポート</Link>
      </div>
    </div>
  );
}
