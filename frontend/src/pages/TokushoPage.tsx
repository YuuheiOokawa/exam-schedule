import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

const CONTACT_EMAIL = 'support@shikaku-schedule.app';

export default function TokushoPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        to={ROUTES.HOME}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-3)] hover:text-[var(--text-2)] mb-6"
      >
        <ArrowLeft size={16} />
        ホームへ戻る
      </Link>

      <h1 className="text-2xl font-bold mb-2">特定商取引法に基づく表記</h1>
      <p className="text-sm text-[var(--text-3)] mb-8">
        特定商取引法第11条（通信販売についての広告）に基づく表示
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <tbody>
            {[
              ['販売事業者', '（準備中）'],
              ['運営責任者', '（準備中）'],
              ['所在地', '請求があった場合、遅延なく開示します'],
              ['電話番号', '請求があった場合、遅延なく開示します'],
              ['メールアドレス', CONTACT_EMAIL],
              ['サービス名称', '資格スケジュール'],
              ['サービス内容', '資格試験のスケジュール管理・通知Webアプリ'],
              ['販売価格',
                '月額プラン：¥480 / 3ヶ月プラン：¥1,380 / 6ヶ月プラン：¥2,640 / 年額プラン：¥4,560\n（いずれも税込）'],
              ['支払方法', 'クレジットカード（Visa / Mastercard / American Express / JCB）'],
              ['支払時期', '各請求期間開始時に自動決済'],
              ['サービス提供時期', '決済完了後、即時'],
              ['返品・解約', '7日以内の返金対応。解約はStripeポータルよりいつでも可能。解約後も期間終了まで利用可。'],
              ['動作環境', '最新版のChrome / Firefox / Safari / Edge（Internet Explorer非対応）'],
            ].map(([label, value]) => (
              <tr key={label} className="border-b border-[var(--border)]">
                <th className="py-3 pr-4 text-left font-medium text-[var(--text-3)] whitespace-nowrap w-36 align-top">
                  {label}
                </th>
                <td className="py-3 text-[var(--text-1)] whitespace-pre-line">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 pt-6 border-t border-[var(--border)] flex gap-4 text-xs text-[var(--text-3)]">
        <Link to={ROUTES.PRIVACY} className="hover:underline">プライバシーポリシー</Link>
        <Link to={ROUTES.TERMS}   className="hover:underline">利用規約</Link>
        <Link to={ROUTES.SUPPORT} className="hover:underline">サポート</Link>
      </div>
    </div>
  );
}
