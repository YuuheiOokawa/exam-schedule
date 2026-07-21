# 資格試験スケジュール管理アプリ

資格試験の日程・申込期間・合格発表日を一元管理できるWebアプリです。会員登録・スコア履歴管理・複数の受験計画に加え、
Stripeによる有料プラン（Freemium）・Web Pushでのリマインド通知・PWA対応まで実装したフルスタックのSaaSです。

## 対応資格

| 資格名 | カテゴリ |
|--------|----------|
| Oracle Master Bronze DBA 2019 | データベース |
| 基本情報技術者試験 | 国家資格 |
| 応用情報技術者試験 | 国家資格 |
| AWS Certified Cloud Practitioner | クラウド |
| AWS Certified Solutions Architect - Associate | クラウド |
| Java SE 11 Silver | Java |
| Java SE 11 Gold | Java |

## 主な機能

| 機能 | 説明 |
|---|---|
| 資格スケジュール管理 | 検索・カテゴリ絞り込み・カレンダー表示（FullCalendar） |
| 会員認証 | メール/パスワードでの登録・ログイン・パスワードリセット（JWT + bcrypt） |
| 受験計画・スコア履歴 | 複数資格の受験計画登録、取得済み資格の記録、科目別スコア履歴の管理 |
| ウィッシュリスト | 気になる資格をリストに保存 |
| 有料プラン（Freemium） | Stripeによる月額/3ヶ月/6ヶ月/年額のサブスクリプション課金・Webhook連携 |
| プッシュ通知 | Web Push（VAPID）による試験日程のリマインド |
| PWA対応 | ホーム画面への追加、Service Workerによるオフライン対応 |
| 管理画面 | 資格の追加・編集、スクレイパーによる公式サイトからの自動情報取得 |
| 法定ページ | 特定商取引法に基づく表記・利用規約・プライバシーポリシー |

## 技術スタック

**バックエンド**: Node.js / Express / TypeScript / PostgreSQL（Neon） / JWT認証 + bcrypt /
Stripe（決済・サブスクリプション） / web-push（プッシュ通知） / Resend / SMTP（メール送信） /
node-cron（定期実行バッチ） / cheerio（公式サイトスクレイピング）

**フロントエンド**: React 18 / TypeScript / Vite / FullCalendar / TanStack Query / Tailwind CSS /
PWA（Web App Manifest + Service Worker）

**インフラ**: フロントエンド = Vercel / バックエンド = Railway / DB = PostgreSQL（Neon）

## セットアップ

### 前提条件

- Node.js 18以上
- PostgreSQL接続文字列（[Neon](https://neon.tech) の無料枠推奨）

### 手順

```bash
# バックエンド（ターミナル1）
cd backend
npm install
cp .env.example .env   # DATABASE_URL・JWT_SECRET等を設定
npm run dev             # http://localhost:3001

# フロントエンド（ターミナル2）
cd frontend
npm install
npm run dev             # http://localhost:3000
```

Stripe決済・プッシュ通知・メール送信は任意機能です。`.env.example` に設定手順のコメント付きで
必要な環境変数をまとめています（未設定でもコア機能は動作します）。

## 画面構成

- **資格一覧・詳細・カレンダー** — 検索・カテゴリ絞り込み・カレンダー表示
- **会員登録・ログイン・パスワードリセット**
- **ダッシュボード・プロフィール** — 受験計画・取得済み資格・スコア履歴
- **ウィッシュリスト**
- **料金プラン** — 有料プランへのアップグレード（Stripe Checkout）
- **管理画面** — 資格の追加・編集・スクレイパー実行・ログ確認
- **特定商取引法に基づく表記・利用規約・プライバシーポリシー**

## データベース（主要テーブル）

| テーブル | 概要 |
|----------|------|
| `qualifications` / `qualification_schedules` | 資格マスタ・試験スケジュール |
| `users` / `password_reset_tokens` / `pending_registrations` | 会員認証 |
| `user_exam_plans` / `user_held_qualifications` / `user_wishlist` | 受験計画・取得済み資格・ウィッシュリスト |
| `qualification_score_history` / `qualification_score_section_defs` / `score_section_values` | 科目別スコア履歴 |
| `plans` / `subscriptions` / `subscription_events` / `payments` | Stripeによる有料プラン・課金履歴 |
| `push_subscriptions` | Web Push通知の購読情報 |
| `fetch_logs` | 公式サイトからの情報取得ログ |

## 新しい資格を追加する方法

### 方法1: 管理画面から追加（推奨）

1. アプリを起動して `/admin` を開く
2. 「資格追加」タブで資格名・カテゴリ・公式URLを入力
3. 「スケジュール編集」タブで試験日等を手動入力

### 方法2: スクレイパーを実装して自動取得

`backend/src/scrapers/` に新しいスクレイパーを作成し、`backend/src/scrapers/index.ts` の
`SCRAPER_MAP` に登録すると、管理画面の「最新情報を取得」から公式サイトの情報を自動取得できます。

## 注意事項

- 公式サイトへのアクセスは3秒間隔でリクエストしています
- 随時受験可能な資格（AWS・Oracle・Java）はカレンダーに表示されません（特定日がないため）
- カレンダーに表示するには管理画面で `YYYY-MM-DD` 形式の日付を手動登録してください
- IPA試験（基本・応用）は年2回の日程を管理画面から手動登録することを推奨します
